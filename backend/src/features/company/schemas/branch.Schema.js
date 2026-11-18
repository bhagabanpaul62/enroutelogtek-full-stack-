import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { companies } from './company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';

export const branch = pgTable('branch', {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').references(() => companies.id),
    userId: uuid('userId').references(() => users.id),
    branchName: varchar('branch_name', { length: 255 }),
    branchCode: varchar('branch_code', { length: 50 }).unique(),
    address: varchar('address', { length: 150 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    pinCode: varchar('pin_code', { length: 10 }).notNull(),
    // Deactivating keeps the branch (and everything that points at it); it just stops being offered.
    isActive: boolean('is_active').notNull().default(true),
    deactivatedAt: timestamp('deactivated_at'),
    ...timestamps,
});
