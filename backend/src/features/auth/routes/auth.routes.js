import {forgetPassword, getRegistration, register, sendOtp, submitRegistration, verifyOtp , } from '#features/auth/controllers/auth.controller.js';
import {aboutMe, login, logout, refreshToken } from '#features/auth/controllers/session.controller.js';

import { authMiddleware } from '#shared/middleware/auth.middleware.js';
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
