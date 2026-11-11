import { pgEnum, uuid, varchar, boolean, timestamp, pgTable, index } from 'drizzle-orm/pg-core';

//reference table
import { companies } from '#features/company/schemas/company.Schema.js';
import { branch } from '#features/company/schemas/branch.Schema.js';
import { companyRoles } from '#features/team/schemas/companyRole.Schema.js';
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

export const users = pgTable(
    'users',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        // Nullable only for root_admin (the platform's own staff); every company user has one.
        companyId: uuid('company_id').references(() => companies.id),
        branchId: uuid('branch_id').references(() => branch.id),
        name: varchar('name', { length: 255 }).notNull(),
        email: varchar('email', { length: 255 }).notNull().unique(),
        isEmailVerified: boolean('is_email_verified').default(false),
        passwordHash: varchar('password_hash', { length: 1000 }).notNull(),
        phone: varchar('phone', { length: 15 }).unique(),
        profilePhoto: varchar('logo_url', { length: 500 }),
        userStatus: userStatus('user_status').default('active'),
        // Legacy fixed role. Only 'root_admin' (platform staff, no company) is still read;
        // company users get their access from roleId. Kept until a later migration drops it.
        userRole: userRoll('user_role').default('admin'),
        // The company role (team feature). Null only for root_admin.
        roleId: uuid('role_id').references(() => companyRoles.id),
        // Set when an admin gives the person a temporary password; cleared when they change it.
        mustChangePassword: boolean('must_change_password').notNull().default(false),
        lastLogin: timestamp('last_login'),
        ...timestamps,
    },
    (table) => [
        index('users_company_created_idx').on(table.companyId, table.createdAt),
        index('users_role_idx').on(table.roleId),
    ],
);
