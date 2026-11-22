import { successResponse, validationErrorResponse } from '#shared/utils/response.js';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { db } from '#shared/db/index.js';
import bcrypt from 'bcrypt';
import { users, otpVerification, registrationSession } from '#features/auth/schemas/index.js';
import { REVOKE_REASON, newPasswordProblem } from '#features/auth/login.rules.js';
import { endUserSessions } from '#features/auth/services/session.service.js';
import { sendOtpEmail, sendWelcomeEmail } from '#shared/services/email/email.service.js';
import crypto from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { AppError } from '#shared/utils/AppError.js';
import { companies, branch, companyType as companyTypeEnum } from '#features/company/schemas/index.js';
import { documents } from '#features/document/schemas/index.js';
import { generateEnrouteId } from '#shared/utils/genarateEnrouteId.js';
import { createPresetRoles } from '#features/team/services/role.service.js';
import {
    REGISTRATION_DOCUMENT_TTL_MS,
    REGISTRATION_SESSION_TTL_MS,
    REG_OTP_TTL_MS,
    cleanEmail,
    createOtpLimiter,
    otpFormatProblem,
    registrationSessionProblem,
    submitProblem,
} from '#features/auth/registration.rules.js';
import { findRegistrationApplicant } from '#features/auth/services/registrationApplicant.service.js';
import { isUuid } from '#features/auth/services/session.service.js';
import { phoneProblem } from '#shared/utils/phone.js';

const limiter = createOtpLimiter();
const sessionCookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' };
const failWith = (problem) => {
    if (problem) throw AppError.from(problem);
};

//send OTP (registration and password reset share this code)
export const sendOtp = asyncHandler(async (req, res) => {
    const email = cleanEmail(req.body?.email);
    if (!email) {
        return validationErrorResponse(res, 'Validation failed', {
            email: 'Enter a valid email address',
        });
    }
    failWith(limiter.sendProblem(email, Date.now()));

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + REG_OTP_TTL_MS);

    // One live code and one live session per address.
    const session = await db.transaction(async (tx) => {
        await tx.delete(otpVerification).where(eq(otpVerification.email, email));
        await tx.delete(registrationSession).where(eq(registrationSession.email, email));
        await tx.insert(otpVerification).values({ email, otp, expiresAt, isUsed: false });
        const [row] = await tx
            .insert(registrationSession)
            .values({ email, step: 'OTP_SENT', expiresAt })
            .returning();
        return row;
    });

    try {
        await sendOtpEmail(email, otp);
    } catch (error) {
        console.error('Email send failed:', error.message);
        await db.delete(otpVerification).where(eq(otpVerification.email, email));
        await db.delete(registrationSession).where(eq(registrationSession.id, session.id));
        throw new AppError(
            'We could not send the verification email. Check the address and try again in a few minutes.',
            502,
        );
    }
    limiter.recordSend(email, Date.now());

    res.cookie('registration_Session_Id', session.id, { ...sessionCookie, maxAge: REG_OTP_TTL_MS });
    res.cookie('otp_email', email, { ...sessionCookie, maxAge: 30 * 60 * 1000 });
    return successResponse(res, null, 'OTP sent to email', 200);
});

//verify the OTP
export const verifyOtp = asyncHandler(async (req, res) => {
    const email = cleanEmail(req.cookies.otp_email);
    const registrationSessionId = req.cookies.registration_Session_Id;
    const otp = req.body?.otp;

    if (!email || !isUuid(registrationSessionId)) {
        throw new AppError('Start again: ask for a new code.', 400);
    }
    failWith(otpFormatProblem(otp));
    failWith(limiter.guessProblem(email));

    const [session] = await db
        .select()
        .from(registrationSession)
        .where(and(eq(registrationSession.id, registrationSessionId), eq(registrationSession.email, email)))
        .limit(1);
    if (!session || session.expiresAt <= new Date()) {
        throw new AppError('Your code expired. Ask for a new code.', 400);
    }

    const [row] = await db
        .select()
        .from(otpVerification)
        .where(
            and(
                eq(otpVerification.email, email),
                eq(otpVerification.isUsed, false),
                gt(otpVerification.expiresAt, new Date()),
            ),
        )
        .limit(1);
    if (!row) throw new AppError('OTP expired or invalid. Ask for a new code.', 400);

    if (row.otp !== otp) {
        const outcome = limiter.recordWrong(email);
        if (outcome.exhausted) await db.delete(otpVerification).where(eq(otpVerification.id, row.id));
        throw new AppError(outcome.message, outcome.status);
    }

    // Only one request can flip the code to used.
    const used = await db
        .update(otpVerification)
        .set({ isUsed: true })
        .where(and(eq(otpVerification.id, row.id), eq(otpVerification.isUsed, false)))
        .returning({ id: otpVerification.id });
    if (used.length === 0) throw new AppError('OTP expired or invalid. Ask for a new code.', 400);
    limiter.clearGuesses(email);

    await db
        .update(registrationSession)
        .set({ step: 'OTP_VERIFIED', expiresAt: new Date(Date.now() + REGISTRATION_SESSION_TTL_MS) })
        .where(eq(registrationSession.id, session.id));

    const ExistingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const userExists = ExistingUser.length > 0;

    res.cookie('registration_Session_Id', session.id, { ...sessionCookie, maxAge: REGISTRATION_SESSION_TTL_MS });
    res.cookie('otp_email', email, { ...sessionCookie, sameSite: 'lax', maxAge: 30 * 60 * 1000 });

    return successResponse(res, { userExists }, 'OTP verification successful', 200);
});

//register user
export const register = asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const {
        name,
        password,
        phone,
        companyName,
        companyType,
        gstNumber,
        panNumber,
        companyEmailId,
        companyPhoneNumber,
        branchName,
        branchCode,
        address,
        city,
        state,
        pinCode,
    } = body;
    const email = cleanEmail(body.email);

    const required = {
        name, phone, companyName, companyType, companyEmailId, companyPhoneNumber,
        branchName, branchCode, address, city, state, pinCode,
    };
    // Every field must be text (a number or object would reach the database as something else).
    const bad = Object.entries(required).filter(
        ([, v]) => typeof v !== 'string' || v.trim() === '' || v.length > 255,
    );
    if (!email || bad.length > 0 || typeof password !== 'string' || password === '') {
        return validationErrorResponse(res, 'All fields are required', {
            email: email ? null : 'A valid email is required',
            password: typeof password === 'string' && password ? null : 'Password is required',
            ...Object.fromEntries(Object.keys(required).map((k) => [k, bad.some(([b]) => b === k) ? `${k} is required` : null])),
        });
    }
    failWith(newPasswordProblem(password));

    const phoneErrors = {
        phone: phoneProblem(phone, { min: 7 }),
        companyPhoneNumber: phoneProblem(companyPhoneNumber, { min: 7 }),
    };
    if (phoneErrors.phone || phoneErrors.companyPhoneNumber) {
        return validationErrorResponse(res, 'Check the phone number', phoneErrors);
    }

    if (!companyTypeEnum.enumValues.includes(companyType)) {
        return validationErrorResponse(res, 'Invalid company type', {
            companyType: `Company type must be one of: ${companyTypeEnum.enumValues.join(', ')}`,
        });
    }

    //check gst length and panNumber length
    for (const [value, label, max] of [[gstNumber, 'GST', 15], [panNumber, 'PAN', 10]]) {
        if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > max)) {
            throw new AppError(`${label} number must be at most ${max} characters`, 400);
        }
    }

    // The registration session proves this browser verified this email.
    const sessionId = req.cookies.registration_Session_Id;
    const [verified] = isUuid(sessionId)
        ? await db.select().from(registrationSession).where(eq(registrationSession.id, sessionId)).limit(1)
        : [];
    failWith(registrationSessionProblem(verified, email, new Date()));

    //check phone number duplicate
    const checkPhone = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (checkPhone.length > 0) {
        throw new AppError('Phone number already registered', 409);
    }

    //check company phone number duplicate
    const checkCompanyPhone = await db
        .select()
        .from(companies)
        .where(eq(companies.companyPhoneNumber, companyPhoneNumber))
        .limit(1);
    if (checkCompanyPhone.length > 0) {
        throw new AppError('Company phone number already exist ', 409);
    }

    // Check company email duplicate
    const checkCompanyEmail = await db
        .select()
        .from(companies)
        .where(eq(companies.companyEmailId, companyEmailId))
        .limit(1);
    if (checkCompanyEmail.length > 0) {
        throw new AppError('Company email already registered', 409);
    }

    // Check user email duplicate
    const checkUserEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (checkUserEmail.length > 0) {
        throw new AppError('User email already registered', 409);
    }

    // Check GST duplicate (only if provided)
    if (gstNumber) {
        const checkGst = await db
            .select()
            .from(companies)
            .where(eq(companies.gstNumber, gstNumber))
            .limit(1);
        if (checkGst.length > 0) throw new AppError('GST number already taken', 409);
    }

    //Check branchCode duplicate
    const checkBranchCode = await db
        .select()
        .from(branch)
        .where(eq(branch.branchCode, branchCode))
        .limit(1);
    if (checkBranchCode.length > 0) throw new AppError('Branch Code is already exist', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const enrouteCompanyId = generateEnrouteId(companyType);

    const result = await db.transaction(async (tx) => {
        // Insert company
        const [newCompany] = await tx
            .insert(companies)
            .values({
                companyName,
                enrouteCompanyId,
                companyType,
                gstNumber: gstNumber || null,
                panNumber: panNumber || null,
                companyEmailId,
                companyPhoneNumber,
                companyStatus: 'draft',
            })
            .returning();

        // The company's starting roles; the person registering becomes its Owner.
        const { ownerRoleId } = await createPresetRoles(tx, newCompany.id, companyType);

        // Insert user
        const [newUser] = await tx
            .insert(users)
            .values({
                companyId: newCompany.id,
                name,
                email,
                isEmailVerified: true,
                passwordHash,
                phone,
                userStatus: 'active',
                // Legacy column kept in step with the Owner role (see users.Schema.js).
                userRole: 'admin',
                roleId: ownerRoleId,
            })
            .returning();

        // Insert branch
        const [newBranch] = await tx
            .insert(branch)
            .values({
                companyId: newCompany.id,
                userId: newUser.id,
                branchName,
                branchCode,
                address,
                city,
                state,
                pinCode,
            })
            .returning();
        // Update user with branchId
        await tx.update(users).set({ branchId: newBranch.id }).where(eq(users.id, newUser.id));
        await tx.delete(otpVerification).where(eq(otpVerification.email, email));
        // Keep the session for the document step, with more time.
        await tx
            .update(registrationSession)
            .set({ expiresAt: new Date(Date.now() + REGISTRATION_DOCUMENT_TTL_MS) })
            .where(eq(registrationSession.id, verified.id));

        return { newCompany, newUser, newBranch };
    });

    res.cookie('registration_Session_Id', verified.id, {
        ...sessionCookie,
        maxAge: REGISTRATION_DOCUMENT_TTL_MS,
    });
    return successResponse(
        res,
        {
            userId: result.newUser.id,
            companyName: result.newCompany.companyName,
            companyId: result.newCompany.id,
            branchId: result.newBranch.id,
            enrouteCompanyId: result.newCompany.enrouteCompanyId,
            status: 'draft',
        },
        'Registration successful',
        201,
    );
});

// Submit registration (after documents uploaded)
export const submitRegistration = asyncHandler(async (req, res) => {
    const applicant = await findRegistrationApplicant(req.cookies);
    if (!applicant.companyId) throw new AppError('Finish registering before you submit.', 403);
    // A company id in the body is only a cross-check; the company is the applicant's own.
    const suppliedId = req.body?.companyId;
    if (suppliedId !== undefined && suppliedId !== applicant.companyId) {
        throw new AppError('You can only submit your own application.', 403);
    }
    const companyId = applicant.companyId;

    const requiredDocsByType = {
        customer: ['gst', 'pan'],
        transporter: ['gst', 'pan'],
        broker: ['pan'],
        fleet_owner: ['pan'],
    };

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
        throw new AppError('Company not found', 404);
    }
    failWith(submitProblem(company.companyStatus));

    const docs = await db.select().from(documents).where(eq(documents.companyId, companyId));
    const uploadTypes = docs.map((item) => item.documentType);
    const requiredDocs = requiredDocsByType[company.companyType];
    const missingDoc = requiredDocs.filter((doc) => !uploadTypes.includes(doc));

    if (missingDoc.length > 0) {
        throw new AppError(`Missing required documents: ${missingDoc.join(', ')}`, 400);
    }

    const logoDoc = docs.find((docs) => docs.documentType == 'logo');
    const profilePhotoDoc = docs.find((docs) => docs.documentType === 'profileImage');

    // draft -> pending exactly once, even if two submits race.
    const moved = await db
        .update(companies)
        .set({ companyStatus: 'pending', logoUrl: logoDoc?.fileUrl })
        .where(and(eq(companies.id, companyId), eq(companies.companyStatus, 'draft')))
        .returning({ id: companies.id });
    if (moved.length === 0) failWith(submitProblem('pending'));

    // drizzle throws on an empty .set(), so skip when there is no profile photo
    if (profilePhotoDoc?.fileUrl) {
        await db.update(users).set({ profilePhoto: profilePhotoDoc.fileUrl }).where(eq(users.id, applicant.userId));
    }

    const [user] = await db.select().from(users).where(eq(users.id, applicant.userId)).limit(1);

    try {
        await sendWelcomeEmail(user.email, user.name, company.companyName);
    } catch (error) {
        console.error('Welcome email failed:', error.message);
    }

    return successResponse(res, null, 'Application submitted. Pending admin review.', 200);
});

//forget password
export const forgetPassword = asyncHandler(async (req, res) => {
    const { otp, newPassword } = req.body ?? {};
    const email = cleanEmail(req.cookies.otp_email);

    if (!email) {
        return validationErrorResponse(res, 'Ask for a new code first', {
            email: 'email is required ',
        });
    }
    failWith(otpFormatProblem(otp));
    failWith(newPasswordProblem(newPassword));
    failWith(limiter.guessProblem(email));

    const [dbOtp] = await db
        .select()
        .from(otpVerification)
        .where(
            and(
                eq(otpVerification.email, email),
                eq(otpVerification.isUsed, false),
                gt(otpVerification.expiresAt, new Date()),
            ),
        )
        .limit(1);

    if (!dbOtp) throw new AppError('otp is expired', 400);
    if (dbOtp.otp !== otp) {
        const outcome = limiter.recordWrong(email);
        if (outcome.exhausted) await db.delete(otpVerification).where(eq(otpVerification.id, dbOtp.id));
        throw new AppError(outcome.message, outcome.status);
    }
    // Only one request can spend the code.
    const used = await db
        .update(otpVerification)
        .set({ isUsed: true })
        .where(and(eq(otpVerification.id, dbOtp.id), eq(otpVerification.isUsed, false)))
        .returning({ id: otpVerification.id });
    if (used.length === 0) throw new AppError('otp is expired', 400);
    limiter.clearGuesses(email);

    const [ExistingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!ExistingUser) throw new AppError('user not registered', 404);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
        .update(users)
        .set({
            passwordHash: passwordHash,
            // They chose this password themselves, so a temporary one from an admin is replaced.
            mustChangePassword: false,
        })
        .where(eq(users.id, ExistingUser.id));
    //kill every session, recording why so a signed-out device can say so
    await endUserSessions(ExistingUser.id, REVOKE_REASON.PASSWORD_RESET);
    return successResponse(res, null, 'forget password successful', 200);
});

//Get Registration End Point
export const getRegistration = asyncHandler(async (req, res) => {
    const sessionId = req.cookies.registration_Session_Id;
    const email = req.cookies.otp_email;

    if (!isUuid(sessionId) || !email) {
        return validationErrorResponse(res, 'not get email or sessionId in cookies', {
            sessionId: sessionId ? null : 'not faound session ID',
            email: email ? null : 'need email id',
        });
    }

    const [session] = await db
        .select()
        .from(registrationSession)
        .where(
            and(
                eq(registrationSession.id, sessionId),
                eq(registrationSession.email, email),
                gt(registrationSession.expiresAt, new Date()),
            ),
        )
        .limit(1);

    if (!session) {
        throw new AppError('Session expired', 404);
    }
    return successResponse(res, session, 'session found');
});
