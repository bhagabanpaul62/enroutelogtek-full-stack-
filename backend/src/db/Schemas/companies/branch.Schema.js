import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from './company.Schema.js';
import { timestamps } from '../schema.Helper.Colomus/columns.Hemper.js';

export const branch = pgTable('branch', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  branchName: varchar('branch_name', { length: 255 }),
  branchCode: varchar('branch_code', { length: 50 }).unique(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  pinCode: varchar('pin_code', { length: 10 }).notNull(),
  ...timestamps,
});
