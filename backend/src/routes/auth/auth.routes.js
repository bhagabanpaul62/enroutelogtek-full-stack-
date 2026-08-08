import {
    sendOtp,
    verifyOtp,
    register,
    submitRegistration,
    login,
    logout,
    refreshToken,
    forgetPassword,
    aboutMe,
    getRegistration,
} from '#controllers/auth/index.js';
import { authMiddleware } from '#middleware/auth/auth.middleware.js';
import express from 'express';

const router = express.Router();

// Registration flow
router.post('/send-otp', sendOtp);
router.post('/otp-verification', verifyOtp);
router.post('/register', register);
router.post('/submit-registration', submitRegistration);
router.post('/forget-password', forgetPassword);

// Session
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.get('/about-me', authMiddleware, aboutMe);

// Session-registration
router.get('/get-registration-session', getRegistration);

export default router;
