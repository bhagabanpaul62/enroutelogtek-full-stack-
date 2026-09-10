import { errorResponse } from '#shared/utils/response.js';

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

    return errorResponse(res, err.message || 'Internal Server Error', err.statusCode || 500);
};
