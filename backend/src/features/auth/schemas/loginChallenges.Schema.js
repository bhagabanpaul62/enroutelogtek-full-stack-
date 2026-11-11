import { index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';

/**
 * One pending login: the password was right and a code was emailed. The code is stored only
 * as a keyed hash (see login.rules.js). Kept apart from otp_verification on purpose: that table
 * is keyed by email and its used rows prove "email verified" to registration, so a login code
 * there would leak into the registration flow.
 */
export const loginChallenges = pgTable(
    'login_challenges',
    {
        id: uuid('id').primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id),
        codeHash: varchar('code_hash', { length: 64 }).notNull(),
        attempts: integer('attempts').notNull().default(0),
        resendCount: integer('resend_count').notNull().default(0),
        lastSentAt: timestamp('last_sent_at').notNull(),
        expiresAt: timestamp('expires_at').notNull(),
        consumedAt: timestamp('consumed_at'),
        ...timestamps,
    },
    (table) => [index('login_challenges_user_idx').on(table.userId, table.createdAt)],
);
