import { errorResponse, successResponse, validationErrorResponse } from '#utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '#db/index.js';
import bcrypt from 'bcrypt';
import { users, otpVerification, userSessions } from '#db/Schemas/auth/index.js';
import { sendOtpEmail, sendWelcomeEmail } from '#services/email/email.service.js';
import crypto from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { AppError } from '#utils/AppError.js';
import { companies, branch, documents } from '#db/Schemas/companies/index.js';
import { generateEnrouteId } from '#utils/genarateEnrouteId.js';
import { upload } from '#middleware/upload/upload.middleware.js';
import { generateAccessToken, generateRefreshToken } from '#utils/jwt.js';
import strict from 'assert/strict';
import { use } from 'react';

//send OTP
export const sendOtp = asyncHandler(async (req, res) => {
    //we need to get email from req.body
    console.log(`i am in ${req.body}`);
    const { email } = req.body;

    //validate email
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

    //generate otp
    const otp = crypto.randomInt(100000, 999999).toString();

    //delete old otp
    await db.delete(otpVerification).where(eq(otpVerification.email, email));

    //save new otp in data base
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(otpVerification).values({
        email,
        otp,
        expiresAt,
        isUsed: false,
    });

    //send email
    console.log('start send email');
    try {
        await sendOtpEmail(email, otp);
        console.log('email send');
    } catch (error) {
        console.log('email have a problem error ::', error);
    }

    //success email send with response
    return successResponse(res, null, 'otp send to email', 200);
});

//verify the Otp
export const verifyOtp = asyncHandler(async (req, res) => {
    //take email and otp from request
    // console.log('start otp verification ');

    const { email, otp } = req.body;

    //check email id provides or not
    if (!email || !otp) {
        return validationErrorResponse(res, 'email id or otp is not found', {
            error: 'give email id or otp  properly',
        });
    }

    //call db for checking otp
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
        return errorResponse(res, 'Expire otp or invalid otp', 401);
    }

    if (data[0].otp !== otp) {
        throw new AppError('invalid OTP', 401);
    }
    await db
        .update(otpVerification)
        .set({
            isUsed: true,
        })
        .where(eq(otpVerification.id, data[0].id));

    const ExistingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    const userExists = ExistingUser.length > 0;

    return successResponse(res, { userExists }, 'otp verification successful', 200);
});

//register user if not find in our user database
export const register = asyncHandler(async (req, res) => {
    //extract data from request body
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

    //validate all fields
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
            passwordHash: password ? null : 'Password is required',
            phone: phone ? null : 'Phone is required',
            companyName: companyName ? null : 'Company Name is required',
            companyType: companyType ? null : 'Company Type is required',
            companyEmailId: companyEmailId ? null : 'Company Email ID is required',
            companyPhoneNumber: companyPhoneNumber ? null : 'Company Phone Number is required',
            branchName: branchName ? null : 'branch name is required',
            branchCode: branchCode ? null : 'branch code is required',
            city: city ? null : 'city is required',
            state: state ? null : 'state is required',
            pinCode: pinCode ? null : 'Pin Code is required',
        });
    }
    //check company email have duplicate email or not
    const checkCompanyEmail = await db
        .select()
        .from(companies)
        .where(eq(companies.companyEmailId, companyEmailId))
        .limit(1);

    if (checkCompanyEmail.length > 0) {
        throw new AppError('already registered company email id', 409);
    }

    // same check for user
    const checkUserEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (checkUserEmail.length > 0) {
        throw new AppError('already registered user email id  ', 409);
    }
    //check gst

    if (gstNumber) {
        const checkGst = await db
            .select()
            .from(companies)
            .where(eq(companies.gstNumber, gstNumber))
            .limit(1);
        if (checkGst.length > 0) throw new AppError('Gst number all ready taken', 409);
    }
    //hash password
    const passwordHash = await bcrypt.hash(password, 12);
    //generate enroute id
    const enrouteCompanyId = generateEnrouteId(companyType);
    //check email is verified or not
    const [checkEmail] = await db
        .select()
        .from(otpVerification)
        .where(eq(otpVerification.email, email))
        .limit(1);
    if (!checkEmail || checkEmail.isUsed === false) {
        throw new AppError('email is not verified');
    }

    //insert company data
    const [newCompany] = await db
        .insert(companies)
        .values({
            companyName,
            enrouteCompanyId: enrouteCompanyId,
            companyType,
            gstNumber: gstNumber || null,
            panNumber: panNumber || null,
            companyEmailId,
            companyPhoneNumber,
            companyStatus: 'draft',
        })
        .returning();
    //insert user data
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

    //insert branch data
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

    await db
        .update(users)
        .set({
            branchId: newBranch.id,
        })
        .where(eq(users.id, newUser.id));

    //send response
    return successResponse(
        res,
        {
            userId: newUser.id,
            companyName: newCompany.companyName,
            companyId: newCompany.id,
            branchId: newBranch.id,
            status: 'pending',
        },
        'registration successful ',
        201,
    );
});

//submit file
export const submitRegistration = asyncHandler(async (req, res) => {
    const { companyId } = req.body;
    //define required docs
    const requiredDocsByType = {
        customer: ['gst', 'pan'],
        transporter: ['gst', 'pan'],
        broker: ['pan'],
        fleetOwner: ['pan'],
    };

    //get company details
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);

    //company validation
    if (!company) {
        throw new AppError('company not found', 404);
    }
    //get upload document
    const docs = await db.select().from(documents).where(eq(documents.companyId, companyId));
    //get upload doc types
    const uploadTypes = docs.map((item) => item.documentType);
    //check doc
    const requiredDocs = requiredDocsByType[company.companyType];
    console.log(requiredDocs);
    //check missing docs
    const missingDoc = requiredDocs.filter((doc) => !uploadTypes.includes(doc));
    if (missingDoc.length > 0) {
        throw new AppError(`Missing required documents: ${missingDoc.join(', ')}`, 400);
    }
    //update company state in pending
    await db
        .update(companies)
        .set({
            companyStatus: 'pending',
        })
        .where(eq(companies.id, companyId));
    //get user details for email
    const [user] = await db.select().from(users).where(eq(users.companyId, companyId)).limit(1);
    //Send welcome email
    try {
        await sendWelcomeEmail(user.email, user.name, company.companyName);
    } catch (error) {
        console.error('Welcome email failed:', error.message);
    }
    //send success response
    return successResponse(res, null, 'Application submitted. Pending admin review.', 200);
});

export const login = asyncHandler(async (req, res) => {
    //get data
    const { email, password } = req.body;
    //check we have email and password or not 
    if (!email || !password) {
        return validationErrorResponse(res, 'enter email or password', {
            email: email ? null : 'email is required',
            password: password ? null : 'password is required',
        });
    }
    //
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
        throw new AppError('user not exist', 404);
    }

    const checkPassword = await bcrypt.compare(password, user.passwordHash);
    if (checkPassword === false) {
        throw new AppError('password is wrong', 401);
    }

    const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, user.companyId))
        .limit(1);

    if (company.companyStatus !== 'approved') {
        throw new AppError(
            `company status is ${company.companyStatus} need to approved first`,
            403,
        );
    }

    if (user.userStatus !== 'active') {
        throw new AppError(
            `user status is ${user.userStatus} contact to the company for active user`,
            403,
        );
    }

    const checkSession = await db
        .select()
        .from(userSessions)
        .where(
            and(
                eq(userSessions.userId, user.ip),
                eq(userSessions.isActive, true), // ← only active sessions
                gt(userSessions.expiresAt, new Date()), // ← not expired
            ),
        )
        .limit(1);
    if (checkSession.length > 0) {
        throw new AppError(`active user detected logout fist the try aging`, 409);
    }

    const [session] = await db
        .insert(userSessions)
        .values({
            userId: user.id,
            deviceId: req.headers['user-agent'] || 'unknown',
            ipAddress: req.id,
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .returning();

    const accessToken = generateAccessToken({
        userId: user.id,
        companyId: user.companyId,
        role: user.userRole,
        sessionId: session.id,
    });
    const refreshToken = generateRefreshToken({
        userId: user.id,
        sessionId: session.id,
    });

    await db.update(userSessions).set({ refreshToken }).where(eq(userSessions.id,session.id));

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    };

    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return successResponse(
        res,
        {
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.userRole,
            companyId: user.companyId,
            companyName: company.companyName,
        },
        'login successful',
        200,
    );
});
