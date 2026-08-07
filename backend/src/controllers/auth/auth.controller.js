import { successResponse, validationErrorResponse } from '#utils/response.js';
import { asyncHandler } from '#utils/asyncHandler.js';
import { db } from '#db/index.js';
import bcrypt from 'bcrypt';
import {
    users,
    otpVerification,
    userSessions,
    registrationSession,
} from '#db/Schemas/auth/index.js';
import { sendOtpEmail, sendWelcomeEmail } from '#services/email/email.service.js';
import crypto from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { AppError } from '#utils/AppError.js';
import { companies, branch, documents } from '#db/Schemas/companies/index.js';
import { generateEnrouteId } from '#utils/genarateEnrouteId.js';

//send OTP
export const sendOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return validationErrorResponse(res, 'Email id is require', {
            email: 'email id is required',
        });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return validationErrorResponse(res, 'Validation failed', {
            email: 'Invalid email format',
        });
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    await db.delete(otpVerification).where(eq(otpVerification.email, email));

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(otpVerification).values({
        email,
        otp,
        expiresAt,
        isUsed: false,
    });

    const [session] = await db
        .insert(registrationSession)
        .values({
            email: email,
            step: 'OTP_SENT',
            expiresAt: expiresAt,
        })
        .returning();

    try {
        await sendOtpEmail(email, otp);
    } catch (error) {
        console.error('Email send failed:', error.message);
    }

    res.cookie('registration_Session_Id', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 10 * 60 * 1000,
    });

    res.cookie('otp_email', email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 60 * 1000,
    });
    return successResponse(res, null, 'OTP sent to email', 200);
});

//verify the OTP
export const verifyOtp = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    const email = req.cookies.otp_email;
    const registrationSessionId = req.cookies.registration_Session_Id;

    if (!email || !otp) {
        return validationErrorResponse(res, 'email id or otp is not found', {
            error: 'give email id or otp properly',
        });
    }

    const data = await db
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

    if (data.length === 0) {
        throw new AppError('OTP expired or invalid', 400);
    }

    if (data[0].otp !== otp) {
        throw new AppError('Invalid OTP', 400);
    }

    await db
        .update(otpVerification)
        .set({ isUsed: true })
        .where(eq(otpVerification.id, data[0].id));

    await db
        .update(registrationSession)
        .set({
            step: 'OTP_VERIFIED',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        })
        .where(
            and(
                eq(registrationSession.id, registrationSessionId),
                eq(registrationSession.email, email),
            ),
        );

    const ExistingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const userExists = ExistingUser.length > 0;

    res.cookie('registration_Session_Id', registrationSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 10 * 60 * 1000,
    });
    res.cookie('otp_email', email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 60 * 1000,
    });

    return successResponse(res, { userExists }, 'OTP verification successful', 200);
});

//register user
export const register = asyncHandler(async (req, res) => {
    const {
        name,
        email,
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
    } = req.body;

    if (
        !name ||
        !email ||
        !password ||
        !phone ||
        !companyName ||
        !companyType ||
        !companyEmailId ||
        !companyPhoneNumber ||
        !branchName ||
        !branchCode ||
        !address ||
        !city ||
        !state ||
        !pinCode
    ) {
        return validationErrorResponse(res, 'All fields are required', {
            name: name ? null : 'Name is required',
            email: email ? null : 'Email is required',
            password: password ? null : 'Password is required',
            phone: phone ? null : 'Phone is required',
            companyName: companyName ? null : 'Company Name is required',
            companyType: companyType ? null : 'Company Type is required',
            companyEmailId: companyEmailId ? null : 'Company Email ID is required',
            companyPhoneNumber: companyPhoneNumber ? null : 'Company Phone Number is required',
            branchName: branchName ? null : 'Branch name is required',
            branchCode: branchCode ? null : 'Branch code is required',
            address: address ? null : 'address is requried',
            city: city ? null : 'City is required',
            state: state ? null : 'State is required',
            pinCode: pinCode ? null : 'Pin Code is required',
        });
    }

    //check gst length and panNumber length
    if (gstNumber && gstNumber.length > 15) throw new AppError('GST number must be 15 characters',400);
    if (panNumber && panNumber.length > 10) throw new AppError('PAN number must me 10 characters',400);

    // Check email is verified via OTP
    const [checkEmail] = await db
        .select()
        .from(otpVerification)
        .where(eq(otpVerification.email, email))
        .limit(1);
    if (!checkEmail || checkEmail.isUsed === false) {
        throw new AppError('Email is not verified', 403);
    }

    //check phone number duplicate
    const checkPhone = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (checkPhone.length > 0) {
        throw new AppError('Phone number already registered',409);
    }

    //check company phone number duplicate
    const checkCompanyPhone = await db
        .select()
        .from(companies)
        .where(eq(companies.companyPhoneNumber , companyPhoneNumber))
        .limit(1);
    if(checkCompanyPhone.length > 0){
        throw new AppError('Company phone number already exist ',409)
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
    const checkBranchCode = await db.select().from(branch).where(eq(branch.branchCode , branchCode)).limit(1);
    if(checkBranchCode.length > 0 ) throw new AppError('Branch Code is already exist',409)

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
                userRole: 'admin',
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

        return { newCompany, newUser, newBranch };
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
    const { companyId } = req.body;

    const requiredDocsByType = {
        customer: ['gst', 'pan'],
        transporter: ['gst', 'pan'],
        broker: ['pan'],
        fleetOwner: ['pan'],
    };

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
        throw new AppError('Company not found', 404);
    }

    const docs = await db.select().from(documents).where(eq(documents.companyId, companyId));
    const uploadTypes = docs.map((item) => item.documentType);
    const requiredDocs = requiredDocsByType[company.companyType];
    const missingDoc = requiredDocs.filter((doc) => !uploadTypes.includes(doc));

    if (missingDoc.length > 0) {
        throw new AppError(`Missing required documents: ${missingDoc.join(', ')}`, 400);
    }

    await db.update(companies).set({ companyStatus: 'pending' }).where(eq(companies.id, companyId));

    const [user] = await db.select().from(users).where(eq(users.companyId, companyId)).limit(1);

    try {
        await sendWelcomeEmail(user.email, user.name, company.companyName);
    } catch (error) {
        console.error('Welcome email failed:', error.message);
    }

    return successResponse(res, null, 'Application submitted. Pending admin review.', 200);
});

//forget password
export const forgetPassword = asyncHandler(async (req, res) => {
    //get email , otp , new password from req
    const { email, otp, newPassword } = req.body;
    //check validation email ,otp , new password
    if (!email || !otp || !newPassword)
        return validationErrorResponse(res, 'required email password and otp ', {
            email: !email ? 'email is required ' : null,
            otp: !otp ? 'otp is required' : null,
            newPassword: !newPassword ? 'newPassword is required' : null,
        });
    //verify the otp
    //get otp from db
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
    if (dbOtp.otp !== otp) throw new AppError('otp is invalid', 400);
    //update otp is used
    await db
        .update(otpVerification)
        .set({
            isUsed: true,
        })
        .where(eq(otpVerification.email, email));
    //get user details
    const [ExistingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!ExistingUser) throw new AppError('user not registered', 401);
    //make hashed the password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    //update the password
    await db
        .update(users)
        .set({
            passwordHash: passwordHash,
        })
        .where(eq(users.id, ExistingUser.id));
    //update session or kill the session
    await db
        .update(userSessions)
        .set({
            refreshToken: null,
            isActive: false,
        })
        .where(eq(userSessions.userId, ExistingUser.id));
    //success response
    return successResponse(res, null, 'forget password successful', 200);
});

//Get Registration End Point
export const getRegistration = asyncHandler(async (req, res) => {
    const sessionId = req.cookies.registration_Session_Id;
    const email = req.cookies.otp_email;

    if (!sessionId || !email) {
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
    return successResponse(res, session, 'session faound');
});
