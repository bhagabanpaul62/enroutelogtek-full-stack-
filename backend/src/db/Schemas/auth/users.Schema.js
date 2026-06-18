import {
  pgEnum,
  serial,
  varchar,
  boolean,
  integer,
  timestamp,
  pgTable,
} from 'drizzle-orm/pg-core';

//reference table
import { companies } from '../companies/company.Schema';
import { branch } from '../companies/branch.Schema';
import { timestamps } from '../schema.Helper.Colomus/columns.Hemper';

export const UserStatus = pgEnum('user_status', [
  'active',
  'inactive',
  'blocked',
]);
export const userRoll = pgEnum('user_role', [
  'rootAdmin',
  'admin',
  'viewer',
  'bidManager',
  'TripManager',
  'accounts',
]);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  branchId: integer('branch_id')
    .notNull()
    .references(() => branch.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  isEmailVerified: boolean('is_email_verified').default(false),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 15 }).unique(),
  UserStatus: UserStatus('user_status').default('active'),
  userRole: userRoll('user_role').default('rootAdmin'),
  lastLogin: timestamp('last_login'),
  ...timestamps,
});
