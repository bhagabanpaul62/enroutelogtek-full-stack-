import {
  pgTable,
  serial,
  primaryKey,
  varchar,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';
import { timestamps } from '../schema.Helper.Colomus/columns.Hemper';

export const companyType = pgEnum('company_type', [
  'customer',
  'transporter',
  'broker',
  'fleetOwner',
]);
export const CompanyStatus = pgEnum('company_status', [
  'pending',
  'rejected',
  'approved',
  'blocked',
]);

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  enrouteCompanyId: varchar('enroute_company_id', { length: 50 })
    .notNull()
    .unique(),
  companyType: companyType('company_type').notNull(),
  gstNumber: varchar('gst_number', { length: 15 }).notNull(),
  panNumber: varchar('pan_number', { length: 10 }).notNull(),
  companyEmailId: varchar('company_email_id', { length: 15 })
    .notNull()
    .unique(),
  companyPhoneNumber: varchar('company_phone_no', { length: 500 })
    .notNull()
    .unique(),
  logoUrl: varchar('logo_url', { length: 500 }).notNull(),
  CompanyStatus: CompanyStatus('company_status').default('pending'),
  ...timestamps,
});
