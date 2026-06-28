import { register, sendOtp, submitRegistration, verifyOtp } from '#controllers/auth.controller.js';
import express from 'express'
 
const router = express.Router();

//routes 
router.post('/send-otp',sendOtp);
router.post('/otp-verification',verifyOtp);
router.post('/register',register);
router.post('/submit-registration',submitRegistration);

export default router;