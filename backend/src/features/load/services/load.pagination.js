/**
 * Cursor pagination for load lists, the same scheme the network and platform lists use:
 * sorted by createdAt DESC, id DESC; the cursor is the last row's createdAt (as Postgres
 * text, so microseconds survive) plus its id.
 */
import { sql } from 'drizzle-orm';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';

/** createdAt as exact Postgres text, used only to build the next cursor. */
export const cursorCreatedAt = (column) => sql`${column}::text`.mapWith(String);

/** Rows that come after the cursor when sorted by createdAt DESC, id DESC. */
export const afterCursor = (createdAtColumn, idColumn, cursor) => {
    const { createdAt, id } = decodeCursor(cursor);
    return sql`(${createdAtColumn}, ${idColumn}) < (${createdAt}::timestamp, ${id}::uuid)`;
};

/**
 * Queries fetch limit + 1 rows; the extra row only says that another page exists.
 * @param {Array<object>} rows each carrying cursorCreatedAt and cursorId
 * @param {number} limit page size
 * @param {(row: object) => object} present maps a raw row to its response shape
 */
export const toPage = (rows, limit, present = (row) => row) => {
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];

    return {
        items: pageRows.map(({ cursorCreatedAt: created, cursorId, ...row }) => present(row)),
        pagination: {
            limit,
            hasMore,
            nextCursor: hasMore
                ? encodeCursor({ createdAt: last.cursorCreatedAt, id: last.cursorId })
                : null,
        },
    };
};
