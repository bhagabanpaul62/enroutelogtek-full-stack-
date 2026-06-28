import { pgTable, uuid, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "../schema.Helper.Columns/column.Helper.js";


export const otpVerification = pgTable('otp_verification', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  otp: varchar('otp', { length: 6 }).notNull(),
  isUsed: boolean('is_used').default(false),
  expiresAt: timestamp('expires_at').notNull(),
  ...timestamps
});