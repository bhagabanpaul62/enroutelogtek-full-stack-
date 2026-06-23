import { errorResponse, successResponse, validationErrorResponse } from '#utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { db } from '#db/index.js';

import { users , otpVerification } from '#db/Schemas/auth/index.js'
import { sendOtpEmail } from '#services/email/email.service.js';
import crypto from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { AppError } from '#utils/AppError.js';

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
    
    const ExistingUser = await db.select()
        .from(users)
        .where(eq(users.email,email))
        .limit(1);

    const userExists = ExistingUser.length > 0

    return successResponse(res, {userExists}, 'otp verification successful', 200);
});


//register user if not find in our user database 
export const register = asyncHandler(async(req,res)=>{
    
})

