import { pgEnum, uuid, varchar, boolean, timestamp, pgTable } from 'drizzle-orm/pg-core';

//reference table
import { companies } from '#features/company/schemas/company.Schema.js';
import { branch } from '#features/company/schemas/branch.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';

export const userStatus = pgEnum('user_status', ['active', 'inactive', 'blocked']);
export const userRoll = pgEnum('user_role', [
    'root_admin',
    'admin',
    'co-admin',
    'viewer',
    'bid_manager',
    'trip_manager',
    'accounts',
]);

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
        .notNull()
        .references(() => companies.id),
    branchId: uuid('branch_id').references(() => branch.id),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    isEmailVerified: boolean('is_email_verified').default(false),
    passwordHash: varchar('password_hash', { length: 1000 }).notNull(),
    phone: varchar('phone', { length: 15 }).unique(),
    profilePhoto: varchar('logo_url', { length: 500 }),
    userStatus: userStatus('user_status').default('active'),
    userRole: userRoll('user_role').default('admin'),
    lastLogin: timestamp('last_login'),
    ...timestamps,
});
