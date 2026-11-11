import nodemailer from 'nodemailer';
import {
    otpEmailTemplate,
    welcomeEmailTemplate,
    approvalEmailTemplate,
    rejectionEmailTemplate,
} from './emailTemplates/emailTemplatesForRegistration.js';
import { loginOtpEmailTemplate } from './emailTemplates/emailTemplatesForLogin.js';

//create transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

//core email sender
export const sendEmail = async ({ to, subject, html, text }) => {
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
        text,
    });
};

// =====================
// SPECIFIC EMAILS
// =====================

export async function sendOtpEmail(email, otp) {
    await sendEmail({
        to: email,
        subject: 'EnrouteLogTech - Email Verification OTP',
        html: otpEmailTemplate(otp),
        text: `Your OTP is: ${otp}. Valid for 10 minutes. Do not share.`,
    });
}

/**
 * Emails the second-step login code. Throws when the mail server refuses, so the caller can
 * tell the person instead of claiming the code was sent.
 * @param {string} email the account's address
 * @param {string} code six digits
 */
export async function sendLoginOtpEmail(email, code) {
    await sendEmail({
        to: email,
        subject: 'EnrouteLogTech - Your login code',
        html: loginOtpEmailTemplate(code),
        text: `Your login code is: ${code}. Valid for 10 minutes. Do not share it. If you did not try to log in, reset your password.`,
    });
}

export async function sendWelcomeEmail(email, name, companyName) {
    await sendEmail({
        to: email,
        subject: 'Welcome to EnrouteLogTech - Application Received',
        html: welcomeEmailTemplate(name, companyName),
        text: `Welcome ${name}! Your application is under review.`,
    });
}

export async function sendApprovalEmail(email, companyName) {
    await sendEmail({
        to: email,
        subject: 'EnrouteLogTech - Your Account is Approved!',
        html: approvalEmailTemplate(companyName),
        text: `Congratulations! ${companyName} has been approved.`,
    });
}

export async function sendRejectionEmail(email, companyName, reason) {
    await sendEmail({
        to: email,
        subject: 'EnrouteLogTech - Application Status Update',
        html: rejectionEmailTemplate(companyName, reason),
        text: `Application for ${companyName} was not approved. Reason: ${reason}`,
    });
}
