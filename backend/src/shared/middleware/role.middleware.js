import { AppError } from '#shared/utils/AppError.js';

export const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError('you do not have permission ', 403));
        }
        next();
    };
};
