import { getTableName, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

// Timestamp columns are "timestamp without time zone" and Drizzle reads them as UTC.
// Pin every connection to UTC so now() / defaultNow() also write UTC, whatever timezone
// the database server itself is set to (e.g. a local Postgres on Asia/Kolkata).
export const db = drizzle({
    connection: {
        connectionString: process.env.DATABASE_URL,
        options: '-c timezone=UTC',
    },
});

/**
 * An outer-table column for a correlated subquery, always written "table"."column".
 * Drizzle prints a bare "id" inside the select list of a one-table query, and inside a
 * subquery a bare name binds to the subquery's own table (t.driver_id = t.id).
 */
export const outer = (column) => sql.raw(`"${getTableName(column.table)}"."${column.name}"`);
