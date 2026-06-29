import { errorResponse, successResponse, validationErrorResponse } from '#utils/response.js';
import { asyncHandler } from '#utils/asyncHandler.js';
import { db } from '#db/index.js';
import bcrypt from 'bcrypt';
import { users, otpVerification } from '#db/Schemas/auth/index.js';
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

    try {
        await sendOtpEmail(email, otp);
    } catch (error) {
        console.error('Email send failed:', error.message);
    }

    return successResponse(res, null, 'OTP sent to email', 200);
});

//verify the OTP
export const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

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

    const ExistingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const userExists = ExistingUser.length > 0;

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
            city: city ? null : 'City is required',
            state: state ? null : 'State is required',
            pinCode: pinCode ? null : 'Pin Code is required',
        });
    }

    // Check email is verified via OTP
    const [checkEmail] = await db
        .select()
        .from(otpVerification)
        .where(eq(otpVerification.email, email))
        .limit(1);
    if (!checkEmail || checkEmail.isUsed === false) {
        throw new AppError('Email is not verified', 403);
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

    const passwordHash = await bcrypt.hash(password, 12);
    const enrouteCompanyId = generateEnrouteId(companyType);

    // Insert company
    const [newCompany] = await db
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
    const [newUser] = await db
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
    const [newBranch] = await db
        .insert(branch)
        .values({
            companyId: newCompany.id,
            userId: newUser.id,
            branchName,
            branchCode,
            city,
            state,
            pinCode,
        })
        .returning();

    // Update user with branchId
    await db.update(users).set({ branchId: newBranch.id }).where(eq(users.id, newUser.id));

    return successResponse(
        res,
        {
            userId: newUser.id,
            companyName: newCompany.companyName,
            companyId: newCompany.id,
            branchId: newBranch.id,
            enrouteCompanyId: newCompany.enrouteCompanyId,
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
