import { boolean, pgTable, uuid, timestamp, varchar } from 'drizzle-orm/pg-core';
import { timestamps } from '#shared/schemas/column.Helper.js';

export const passwordResets = pgTable('password_resets', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    token: varchar('token', { length: 1000 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    isUsed: boolean('is_used').default(false),
    ...timestamps,
});
