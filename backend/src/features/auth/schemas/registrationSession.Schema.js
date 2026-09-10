import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { timestamps } from '#shared/schemas/column.Helper.js';

export const registrationStep = pgEnum('registration_step', ['OTP_SENT', 'OTP_VERIFIED']);

export const registrationSession = pgTable('registration_session', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    step: registrationStep('step').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    ...timestamps,
});
