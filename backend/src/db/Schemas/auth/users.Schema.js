import { pgEnum, uuid, varchar, boolean, timestamp, pgTable } from 'drizzle-orm/pg-core';

//reference table
import { companies } from '../companies/company.Schema.js';
import { branch } from '../companies/branch.Schema.js';
import { timestamps } from '../schema.Helper.Columns/column.Helper.js';

export const userStatus = pgEnum('user_status', ['active', 'inactive', 'blocked']);
export const userRoll = pgEnum('user_role', [
    'rootAdmin',
    'admin',
    'co-admin',
    'viewer',
    'bidManager',
    'TripManager',
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
    userStatus: userStatus('user_status').default('active'),
    userRole: userRoll('user_role').default('admin'),
    lastLogin: timestamp('last_login'),
    ...timestamps,
});
