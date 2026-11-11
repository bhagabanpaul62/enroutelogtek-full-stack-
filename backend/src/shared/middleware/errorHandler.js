import { errorResponse } from '#shared/utils/response.js';
import { AppError } from '#shared/utils/AppError.js';

export const errorHandler = (err, req, res, next) => {
    console.error('\n========== ERROR ==========');
    console.error('Message:', err.message);
    console.error('Status:', err.statusCode || 500);

    if (err.cause) {
        console.error('\n----- Database Error -----');
        console.error('Message:', err.cause.message);
        console.error('Code:', err.cause.code);
        console.error('Detail:', err.cause.detail);
        console.error('Table:', err.cause.table);
        console.error('Column:', err.cause.column);
        console.error('Constraint:', err.cause.constraint);
    }

    console.error('\n----- Stack -----');
    console.error(err.stack);
    console.error('===========================\n');

    // Only our own errors carry a client-facing code; database errors have a `code` too (e.g. 23505)
    // and must not leak.
    const detail = err instanceof AppError && err.code ? { code: err.code } : null;
    return errorResponse(res, err.message || 'Internal Server Error', err.statusCode || 500, detail);
};
