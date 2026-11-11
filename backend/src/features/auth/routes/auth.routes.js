import {forgetPassword, getRegistration, register, sendOtp, submitRegistration, verifyOtp , } from '#features/auth/controllers/auth.controller.js';
import {
    aboutMe,
    changePassword,
    login,
    logout,
    refreshToken,
    resendLoginOtp,
    verifyLoginOtp,
} from '#features/auth/controllers/session.controller.js';

import { authAllowingPasswordChange } from '#shared/middleware/auth.middleware.js';
import express from 'express';

const router = express.Router();

// Registration flow
router.post('/send-otp', sendOtp);
router.post('/otp-verification', verifyOtp);
router.post('/register', register);
router.post('/submit-registration', submitRegistration);
router.post('/forget-password', forgetPassword);

// Session
// Two-step login: password, then the emailed code. The code step ends other sessions.
router.post('/login', login);
router.post('/login/verify-otp', verifyLoginOtp);
router.post('/login/resend-otp', resendLoginOtp);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
// These two still work while the account has a temporary password; every other protected
// route answers 403 PASSWORD_CHANGE_REQUIRED until the person sets their own.
router.get('/about-me', authAllowingPasswordChange, aboutMe);
router.post('/change-password', authAllowingPasswordChange, changePassword);

// Session-registration
router.get('/get-registration-session', getRegistration);

export default router;
