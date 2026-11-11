import { AppError } from '#shared/utils/AppError.js';
import { hasPermission } from '#features/team/team.rules.js';

/**
 * Lets the request through only when req.user holds at least one of the permissions.
 * Runs after authMiddleware, which fills req.user.permissions from the user's company role.
 * @param {...string} keys one or more of PERMISSIONS (any one is enough)
 * @returns {import('express').RequestHandler}
 * @throws {AppError} 403 when none is held
 */
export const requirePermission =
    (...keys) =>
    (req, res, next) => {
        if (keys.some((key) => hasPermission(req.user, key))) return next();
        return next(new AppError('You do not have permission to do this.', 403));
    };
