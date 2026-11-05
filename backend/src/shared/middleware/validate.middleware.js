import { validationResult } from 'express-validator';

// Runs after express-validator rules in a route: stops the request with 422 if any rule failed.
// The first message is used as the main message so the frontend can show it as-is.
export const validate = (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) {
        return next();
    }

    const errors = result.array({ onlyFirstError: true });
    const error = Object.fromEntries(errors.map((err) => [err.path, err.msg]));

    return res.status(422).json({
        success: false,
        message: errors[0].msg,
        error,
    });
};
