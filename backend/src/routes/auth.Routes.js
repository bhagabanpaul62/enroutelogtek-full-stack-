import { sendOtp, verifyOtp } from '#controllers/auth.controllers.js';
import express from 'express'
 
const router = express.Router();

//routes 
router.post('/send-otp',sendOtp);
router.post('/otp-verification',verifyOtp);

export default router;