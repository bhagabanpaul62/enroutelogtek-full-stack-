/**
 * LOGIN RULES: the pure decisions behind the two-step login (password, then an emailed code)
 * and the one-session-per-user rule. No database or email here, so every rule is unit tested.
 * Each "problem" is `{ status, message, code? }` or null; services turn it into an AppError.
 */
import crypto from 'node:crypto';

/** How long an emailed login code stays valid. */
export const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
/** Wrong codes allowed per challenge; the last one ends it and the person logs in again. */
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
/** Minimum gap between two emails for the same challenge. */
export const LOGIN_CODE_RESEND_COOLDOWN_MS = 30 * 1000;
/** New codes allowed per challenge after the first one. */
export const LOGIN_CODE_MAX_RESENDS = 3;
/** Lifetime of a login session (and of its refresh token cookie). */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Why a session row was made inactive. Stored in user_sessions.revoked_reason. */
export const REVOKE_REASON = Object.freeze({
    LOGOUT: 'logout',
    NEW_LOGIN: 'new_login',
    PASSWORD_RESET: 'password_reset',
    // A team admin deactivated the person or gave them a new temporary password.
    ACCESS_CHANGED: 'access_changed',
});

/**
 * Machine-readable codes sent as `error.code` so the browser can react without parsing text:
 * LOGIN_RESTART → go back to the password step; SESSION_REPLACED → this device was signed out
 * by a login elsewhere; SESSION_ENDED → any other ended session; PASSWORD_CHANGE_REQUIRED → the
 * account has a temporary password and must set its own before doing anything else.
 */
export const AUTH_ERROR_CODE = Object.freeze({
    LOGIN_RESTART: 'LOGIN_RESTART',
    SESSION_REPLACED: 'SESSION_REPLACED',
    SESSION_ENDED: 'SESSION_ENDED',
    PASSWORD_CHANGE_REQUIRED: 'PASSWORD_CHANGE_REQUIRED',
});

/** Password length limits. bcrypt ignores everything after 72 bytes, so longer is refused. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

const restart = (status, message) => ({ status, message, code: AUTH_ERROR_CODE.LOGIN_RESTART });

/**
 * A random six-digit code. The full range is used, so it can start with zero.
 * @returns {string} six digits
 */
export function generateLoginCode() {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Keyed hash of a code, bound to its challenge so a hash cannot be replayed on another one.
 * Keyed (HMAC) rather than plain SHA-256 because a six-digit space is trivial to brute-force
 * from a leaked table without the server key.
 * @param {string} code the six digits
 * @param {string} challengeId the challenge the code belongs to
 * @param {string} key server secret
 * @returns {string} 64 hex characters
 */
export function hashLoginCode(code, challengeId, key) {
    return crypto.createHmac('sha256', key).update(`${challengeId}:${code}`).digest('hex');
}

/**
 * Compares a typed code with the stored hash in constant time.
 * @returns {boolean} true only for the right code of this challenge under this key
 */
export function loginCodeMatches(code, challengeId, storedHash, key) {
    const expected = Buffer.from(String(storedHash ?? ''), 'hex');
    const actual = Buffer.from(hashLoginCode(code, challengeId, key), 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/**
 * Why a code can no longer be checked against this challenge, or null when it can.
 * @param {{ consumedAt: Date|null, attempts: number, expiresAt: Date } | undefined} challenge
 * @param {Date} now
 */
export function challengeProblem(challenge, now) {
    if (!challenge || challenge.consumedAt) {
        return restart(400, 'This login code is no longer valid. Log in again.');
    }
    if (challenge.attempts >= LOGIN_CODE_MAX_ATTEMPTS) {
        return restart(429, 'Too many wrong codes. Log in again.');
    }
    if (challenge.expiresAt.getTime() <= now.getTime()) {
        return restart(400, 'Your login code expired. Log in again.');
    }
    return null;
}

/**
 * The result of one wrong code: the new attempt count and what to tell the person.
 * @param {number} attempts wrong codes so far, before this one
 * @returns {{ attempts: number, status: number, message: string, code?: string }}
 */
export function wrongCodeOutcome(attempts) {
    const next = attempts + 1;
    const left = LOGIN_CODE_MAX_ATTEMPTS - next;
    if (left <= 0) {
        return { attempts: next, ...restart(429, 'Too many wrong codes. Log in again.') };
    }
    return {
        attempts: next,
        status: 400,
        message: `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left.`,
    };
}

/**
 * Why another code cannot be emailed for this live challenge yet, or null when it can.
 * @param {{ resendCount: number, lastSentAt: Date }} challenge
 * @param {Date} now
 */
export function resendProblem(challenge, now) {
    if (challenge.resendCount >= LOGIN_CODE_MAX_RESENDS) {
        return restart(429, 'Too many codes sent. Log in again.');
    }
    const waitMs = challenge.lastSentAt.getTime() + LOGIN_CODE_RESEND_COOLDOWN_MS - now.getTime();
    if (waitMs > 0) {
        return {
            status: 429,
            message: `Wait ${Math.ceil(waitMs / 1000)} seconds before asking for a new code.`,
        };
    }
    return null;
}

/**
 * Whether a repeated password step should reuse the code just emailed instead of sending
 * another. Stops a double-click or quick retry from flooding the inbox.
 * @param {object | undefined} challenge the person's latest challenge
 * @param {Date} now
 */
export function canReuseChallenge(challenge, now) {
    if (!challenge || challengeProblem(challenge, now)) return false;
    return now.getTime() - challenge.lastSentAt.getTime() < LOGIN_CODE_RESEND_COOLDOWN_MS;
}

/**
 * Why this account may not hold a session right now, or null. Checked at the password step,
 * again when the code is accepted, and on every authenticated request.
 * Platform staff (root_admin) belong to no company; everyone else needs an approved one.
 * @param {{ companyId: string|null, userRole: string, userStatus: string }} user
 * @param {{ companyStatus: string } | null | undefined} company the user's company, if any
 */
export function loginBlockReason(user, company) {
    if (user.companyId) {
        if (!company) return { status: 404, message: 'Company not found. Contact support.' };
        if (company.companyStatus !== 'approved') {
            return {
                status: 403,
                message: `Company status is ${company.companyStatus}. Need approval first.`,
            };
        }
    } else if (user.userRole !== 'root_admin') {
        return { status: 403, message: 'Account is not linked to a company. Contact support.' };
    }
    if (user.userStatus !== 'active') {
        return {
            status: 403,
            message: `User status is ${user.userStatus}. Contact company admin.`,
        };
    }
    return null;
}

/**
 * Why the session behind a token can no longer be used, or null when it is live.
 * @param {{ isActive: boolean, revokedReason: string|null, expiresAt: Date|null } | undefined} session
 * @param {Date} now
 */
export function sessionProblem(session, now) {
    const ended = (message) => ({ status: 401, message, code: AUTH_ERROR_CODE.SESSION_ENDED });
    if (!session) return ended('Session not found. Log in again.');
    if (!session.isActive) {
        if (session.revokedReason === REVOKE_REASON.NEW_LOGIN) {
            return {
                status: 401,
                message: 'You were signed out because your account was signed in on another device.',
                code: AUTH_ERROR_CODE.SESSION_REPLACED,
            };
        }
        return ended('Your session has ended. Log in again.');
    }
    if (!session.expiresAt || session.expiresAt.getTime() <= now.getTime()) {
        return ended('Your session has expired. Log in again.');
    }
    return null;
}

/**
 * Why a signed-in account may not use the app yet, or null. An account with a temporary
 * password (set by a team admin) may only read its profile, change the password or log out.
 * @param {{ mustChangePassword?: boolean }} user
 */
export function passwordChangeProblem(user) {
    if (!user.mustChangePassword) return null;
    return {
        status: 403,
        message: 'Set your own password before you continue.',
        code: AUTH_ERROR_CODE.PASSWORD_CHANGE_REQUIRED,
    };
}

/**
 * Why a new password (chosen by the person or set as temporary by an admin) is not acceptable.
 * @param {unknown} password
 */
export function newPasswordProblem(password) {
    if (
        typeof password !== 'string' ||
        password.length < PASSWORD_MIN_LENGTH ||
        password.length > PASSWORD_MAX_LENGTH
    ) {
        return {
            status: 422,
            message: `Password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`,
        };
    }
    return null;
}
