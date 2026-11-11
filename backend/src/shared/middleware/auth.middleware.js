import { AppError } from '#shared/utils/AppError.js';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import {
    loginBlockReason,
    passwordChangeProblem,
    sessionProblem,
} from '#features/auth/login.rules.js';
import {
    decodeToken,
    findSessionContext,
    requestUser,
} from '#features/auth/services/session.service.js';

/**
 * Builds the authentication middleware. It lets a request through only when its access token's
 * own session is still live and the account may still sign in. A device whose session was
 * replaced by a newer login gets 401 with error.code SESSION_REPLACED. req.user comes from
 * current data (see requestUser), so role, permission and company changes apply at once instead
 * of when the token expires.
 * @param {{ allowPasswordChange: boolean }} options true only for the routes a person with a
 *   temporary password may still use (their profile and changing the password)
 * @returns {import('express').RequestHandler}
 * @throws {AppError} 401 no/invalid token or ended session; 403/404 account no longer allowed in;
 *   403 PASSWORD_CHANGE_REQUIRED while a temporary password is in use
 */
const authenticate = ({ allowPasswordChange }) =>
    asyncHandler(async (req, res, next) => {
        const { accessToken } = req.cookies;
        if (!accessToken) {
            throw new AppError('no token', 401);
        }
        // No error code here: an expired access token is normal and the client refreshes it.
        const token = decodeToken(accessToken, 'Access token expired or invalid');

        const context = await findSessionContext(token.sessionId);
        const problem =
            sessionProblem(context?.session, new Date()) ??
            loginBlockReason(context.user, context.company) ??
            (allowPasswordChange ? null : passwordChangeProblem(context.user));
        if (problem) throw AppError.from(problem);

        req.user = requestUser(context);
        next();
    });

/** Every protected route. Blocks accounts that still have a temporary password. */
export const authMiddleware = authenticate({ allowPasswordChange: false });

/** Only for about-me and change-password: they must work while a temporary password is set. */
export const authAllowingPasswordChange = authenticate({ allowPasswordChange: true });
