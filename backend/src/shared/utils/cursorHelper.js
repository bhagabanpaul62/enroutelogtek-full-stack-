import { AppError } from '#shared/utils/AppError.js';

// A cursor marks the last item of a page: its createdAt + id (id breaks ties).
// createdAt is kept as Postgres text ("2026-10-26 10:00:00.123456") because a JS Date
// drops the microseconds, which would make the next page skip or repeat rows.
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const encodeCursor = ({ createdAt, id }) => {
    return Buffer.from(JSON.stringify({ createdAt, id })).toString('base64url');
};

export const decodeCursor = (cursor) => {
    try {
        const { createdAt, id } = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        if (TIMESTAMP_PATTERN.test(createdAt) && UUID_PATTERN.test(id)) {
            return { createdAt, id };
        }
    } catch {
        // fall through - any broken cursor is the client's mistake, not a server error
    }
    throw new AppError('Invalid cursor', 400);
};
