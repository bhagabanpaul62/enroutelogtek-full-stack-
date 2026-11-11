import { successResponse, validationErrorResponse } from '#shared/utils/response.js';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { AppError } from '#shared/utils/AppError.js';
import { generateAccessToken } from '#shared/utils/jwt.js';
import { changeOwnPassword } from '#features/auth/services/password.service.js';
import {
    AUTH_ERROR_CODE,
    LOGIN_CODE_TTL_MS,
    REVOKE_REASON,
    SESSION_TTL_MS,
    loginBlockReason,
    sessionProblem,
} from '#features/auth/login.rules.js';
import {
    finishLogin,
    resendLoginCode,
    startLogin,
} from '#features/auth/services/loginChallenge.service.js';
import {
    accessClaims,
    decodeToken,
    endSession,
    findSessionContext,
    sessionUserView,
} from '#features/auth/services/session.service.js';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
// Holds the pending login between the password step and the code step. HttpOnly, so a script
// on the page cannot read or swap it.
const CHALLENGE_COOKIE = 'login_challenge';

const authCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
};

const clearAuthCookies = (res) => {
    res.clearCookie('accessToken', authCookie);
    res.clearCookie('refreshToken', authCookie);
};

const isText = (value) => typeof value === 'string' && value.length > 0;

// The browser keeps the challenge cookie while a retry can still succeed (wrong code, cooldown)
// and drops it once the person has to start again.
const dropChallengeOnRestart = (res, error) => {
    if (error?.code === AUTH_ERROR_CODE.LOGIN_RESTART) res.clearCookie(CHALLENGE_COOKIE, authCookie);
};

const challengeView = ({ email, expiresInSeconds, resendInSeconds, resendsLeft }) => ({
    email,
    expiresInSeconds,
    resendInSeconds,
    resendsLeft,
});

/**
 * Login step 1: email and password. On success emails a code and answers
 * `{ step: 'OTP_REQUIRED', email, expiresInSeconds, resendInSeconds, resendsLeft }`.
 * No session exists until the code is accepted by verifyLoginOtp.
 */
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};

    if (!isText(email) || !isText(password)) {
        return validationErrorResponse(res, 'Enter email and password', {
            email: isText(email) ? null : 'Email is required',
            password: isText(password) ? null : 'Password is required',
        });
    }

    const challenge = await startLogin({ email, password });
    res.cookie(CHALLENGE_COOKIE, challenge.challengeId, { ...authCookie, maxAge: LOGIN_CODE_TTL_MS });

    return successResponse(
        res,
        { step: 'OTP_REQUIRED', ...challengeView(challenge) },
        'Enter the code sent to your email',
        200,
    );
});

/**
 * Login step 2: the emailed code. On success every other session of the user ends (that device
 * is signed out on its next request), the session cookies are set and the session user returned.
 */
export const verifyLoginOtp = asyncHandler(async (req, res) => {
    const { otp } = req.body ?? {};
    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
        return validationErrorResponse(res, 'Enter the 6-digit code', {
            otp: 'Enter all 6 digits',
        });
    }

    try {
        const { user, tokens } = await finishLogin({
            challengeId: req.cookies[CHALLENGE_COOKIE],
            code: otp,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
        });

        res.clearCookie(CHALLENGE_COOKIE, authCookie);
        res.cookie('accessToken', tokens.accessToken, {
            ...authCookie,
            maxAge: ACCESS_TOKEN_MAX_AGE,
        });
        res.cookie('refreshToken', tokens.refreshToken, { ...authCookie, maxAge: SESSION_TTL_MS });

        // Same shape as about-me, including role name, permissions and mustChangePassword.
        return successResponse(res, await sessionUserView(user.id), 'Login successful', 200);
    } catch (error) {
        dropChallengeOnRestart(res, error);
        throw error;
    }
});

/** Emails a new login code for the pending login in the challenge cookie. */
export const resendLoginOtp = asyncHandler(async (req, res) => {
    try {
        const challenge = await resendLoginCode(req.cookies[CHALLENGE_COOKIE]);
        res.cookie(CHALLENGE_COOKIE, challenge.challengeId, {
            ...authCookie,
            maxAge: LOGIN_CODE_TTL_MS,
        });
        return successResponse(res, challengeView(challenge), 'A new code is on its way', 200);
    } catch (error) {
        dropChallengeOnRestart(res, error);
        throw error;
    }
});

// Logout
export const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
        let payload = null;
        try {
            payload = decodeToken(refreshToken, 'invalid refresh token');
        } catch {
            // An invalid or expired refresh token has no live session to end; just clear cookies.
        }
        if (payload) await endSession(payload.sessionId, REVOKE_REASON.LOGOUT);
    }

    clearAuthCookies(res);

    return successResponse(res, null, 'Logout successful', 200);
});

/**
 * Issues a new access token while the refresh token's own session is live and the account may
 * still sign in. Otherwise clears the session cookies, so a signed-out browser stops retrying,
 * and answers 401 with error.code SESSION_REPLACED or SESSION_ENDED (403 for a blocked account).
 */
export const refreshTokenHandler = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
        throw new AppError('not found refreshToken plz login again', 401);
    }

    let context;
    try {
        const token = decodeToken(
            refreshToken,
            'Your session has expired. Log in again.',
            AUTH_ERROR_CODE.SESSION_ENDED,
        );
        context = await findSessionContext(token.sessionId);
        const problem =
            sessionProblem(context?.session, new Date()) ??
            loginBlockReason(context.user, context.company);
        if (problem) throw AppError.from(problem);
    } catch (error) {
        if (error instanceof AppError) clearAuthCookies(res);
        throw error;
    }

    const accessToken = generateAccessToken(accessClaims(context.user, context.session.id));
    res.cookie('accessToken', accessToken, { ...authCookie, maxAge: ACCESS_TOKEN_MAX_AGE });
    return successResponse(res, null, 'Token refreshed', 200);
});

// Keep the old name as alias for backward compatibility in routes
export const refreshToken = refreshTokenHandler;

/**
 * The signed-in user: identity, company, role name, permissions and whether a temporary password
 * must be changed. root_admin has no company; the frontend sends them to /rootAdmin by role.
 */
export const aboutMe = asyncHandler(async (req, res) => {
    return successResponse(res, await sessionUserView(req.user.userId), 'user Fetch', 200);
});

/**
 * Changes the signed-in user's password. Body: { currentPassword, newPassword }. Also how a
 * person with a temporary password from a team admin unlocks the app. Answers with the session
 * user (mustChangePassword now false).
 */
export const changePassword = asyncHandler(async (req, res) => {
    await changeOwnPassword(req.user.userId, req.body ?? {});
    return successResponse(res, await sessionUserView(req.user.userId), 'Password changed', 200);
});
