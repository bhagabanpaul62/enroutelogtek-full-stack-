/**
 * REGISTRATION RULES: the pure decisions behind email verification (registration and password
 * reset share one emailed code), the registration session that proves "this browser verified
 * this email", and the draft -> pending submission. No database or email here, so every rule is
 * unit tested. A "problem" is `{ status, message }` or null; services turn it into an AppError.
 */

/** How long an emailed registration/reset code stays valid. */
export const REG_OTP_TTL_MS = 10 * 60 * 1000;
/** Wrong guesses allowed per email until a new code is asked for. */
export const REG_OTP_MAX_ATTEMPTS = 5;
/** Minimum gap between two emails to the same address. */
export const REG_OTP_RESEND_COOLDOWN_MS = 30 * 1000;
/** Codes emailed to one address per window. */
export const REG_OTP_MAX_SENDS = 5;
export const REG_OTP_SEND_WINDOW_MS = 60 * 60 * 1000;
/** A verified registration session lasts this long; registering extends it for the document step. */
export const REGISTRATION_SESSION_TTL_MS = 30 * 60 * 1000;
export const REGISTRATION_DOCUMENT_TTL_MS = 60 * 60 * 1000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIX_DIGITS = /^\d{6}$/;

/**
 * Email as typed, trimmed. Case is kept because login looks the address up exactly as stored.
 * @param {unknown} value
 * @returns {string|null} the email, or null when it is not a valid address
 */
export function cleanEmail(value) {
    if (typeof value !== 'string') return null;
    const email = value.trim();
    return email.length <= 255 && EMAIL.test(email) ? email : null;
}

/** @param {unknown} otp @returns {{ status: number, message: string } | null} */
export function otpFormatProblem(otp) {
    return typeof otp === 'string' && SIX_DIGITS.test(otp)
        ? null
        : { status: 400, message: 'Enter the 6-digit code from your email.' };
}

/**
 * Why a registration/reset code cannot be emailed to this address right now, or null.
 * @param {number[]} sentAt times (ms) codes were sent to this address, oldest first
 * @param {number} now ms
 */
export function sendProblem(sentAt, now) {
    const recent = sentAt.filter((t) => now - t < REG_OTP_SEND_WINDOW_MS);
    if (recent.length >= REG_OTP_MAX_SENDS) {
        return { status: 429, message: 'Too many codes sent to this email. Try again in an hour.' };
    }
    const last = recent.at(-1);
    const waitMs = last === undefined ? 0 : last + REG_OTP_RESEND_COOLDOWN_MS - now;
    if (waitMs > 0) {
        return {
            status: 429,
            message: `Wait ${Math.ceil(waitMs / 1000)} seconds before asking for a new code.`,
        };
    }
    return null;
}

/** @param {number} attempts wrong guesses so far */
export function guessProblem(attempts) {
    return attempts >= REG_OTP_MAX_ATTEMPTS
        ? { status: 429, message: 'Too many wrong codes. Ask for a new code.' }
        : null;
}

/**
 * The reply to one wrong code.
 * @param {number} attempts wrong guesses before this one
 * @returns {{ attempts: number, status: number, message: string, exhausted: boolean }}
 */
export function wrongOtpOutcome(attempts) {
    const next = attempts + 1;
    const left = REG_OTP_MAX_ATTEMPTS - next;
    if (left <= 0) {
        return { attempts: next, status: 429, message: 'Too many wrong codes. Ask for a new code.', exhausted: true };
    }
    return {
        attempts: next,
        status: 400,
        message: `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left.`,
        exhausted: false,
    };
}

/**
 * In-process counters for the rules above, keyed by email. Restarting the server clears them,
 * and with several API instances each keeps its own count (shortcut: move to a table when the
 * API runs on more than one instance).
 */
export function createOtpLimiter() {
    const sends = new Map();
    const wrong = new Map();
    return {
        sendProblem: (email, now) => sendProblem(sends.get(email) ?? [], now),
        recordSend(email, now) {
            const recent = (sends.get(email) ?? []).filter((t) => now - t < REG_OTP_SEND_WINDOW_MS);
            sends.set(email, [...recent, now]);
            wrong.delete(email); // a fresh code starts a fresh guess budget
        },
        guessProblem: (email) => guessProblem(wrong.get(email) ?? 0),
        recordWrong(email) {
            const outcome = wrongOtpOutcome(wrong.get(email) ?? 0);
            wrong.set(email, outcome.attempts);
            return outcome;
        },
        clearGuesses: (email) => wrong.delete(email),
    };
}

/**
 * Whether a registration session proves that this browser verified this email.
 * @param {{ email: string, step: string, expiresAt: Date } | undefined} session
 * @param {string} email the address the request claims
 * @param {Date} now
 */
export function registrationSessionProblem(session, email, now) {
    if (!session) return { status: 401, message: 'Verify your email first.' };
    if (session.expiresAt.getTime() <= now.getTime()) {
        return { status: 401, message: 'Your verification expired. Verify your email again.' };
    }
    if (session.step !== 'OTP_VERIFIED') return { status: 403, message: 'Email is not verified' };
    if (session.email !== email) {
        return { status: 403, message: 'This session verified a different email.' };
    }
    return null;
}

/**
 * Whether a company may move from draft to pending. Only a draft can be submitted; everything
 * else stays as it is (an approved or blocked company must never be reset to pending).
 * @param {string} status the company's current status
 */
export function submitProblem(status) {
    if (status === 'draft') return null;
    if (status === 'pending') {
        return { status: 409, message: 'This application is already submitted and waiting for review.' };
    }
    return { status: 409, message: `This company is ${status}. It cannot be submitted again.` };
}

/** The documents an applicant may upload before approval. */
export const REGISTRATION_DOCUMENT_TYPES = Object.freeze(['gst', 'pan', 'logo', 'profileImage']);

/**
 * Whether a registration-session upload/delete is allowed: only while the company is a draft
 * and only for registration documents.
 * @param {string} companyStatus
 * @param {string} [documentType] omit for a delete
 */
export function registrationDocumentProblem(companyStatus, documentType) {
    if (companyStatus !== 'draft') {
        return { status: 403, message: 'Documents can no longer be changed while registering.' };
    }
    if (documentType !== undefined && !REGISTRATION_DOCUMENT_TYPES.includes(documentType)) {
        return { status: 403, message: 'This document type is not part of registration.' };
    }
    return null;
}
