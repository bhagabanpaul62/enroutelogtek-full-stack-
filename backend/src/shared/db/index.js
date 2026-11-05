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
