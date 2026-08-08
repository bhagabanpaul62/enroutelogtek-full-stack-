import { pgTable, uuid, varchar, pgEnum } from 'drizzle-orm/pg-core';
import { timestamps } from '../schema.Helper.Columns/column.Helper.js';

export const companyType = pgEnum('company_type', [
    'customer',
    'transporter',
    'broker',
    'flee_owner',
]);
export const companyStatus = pgEnum('company_status', [
    'draft',
    'pending',
    'rejected',
    'approved',
    'blocked',
]);

export const companies = pgTable('companies', {
    id: uuid('id').defaultRandom().primaryKey(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    enrouteCompanyId: varchar('enroute_company_id', { length: 50 }).notNull().unique(),
    companyType: companyType('company_type').notNull(),
    gstNumber: varchar('gst_number', { length: 15 }),
    panNumber: varchar('pan_number', { length: 10 }),
    companyEmailId: varchar('company_email_id', { length: 255 }).notNull().unique(),
    companyPhoneNumber: varchar('company_phone_number', { length: 15 }).notNull().unique(),
    logoUrl: varchar('logo_url', { length: 500 }),
    companyStatus: companyStatus('company_status').default('draft'),
    ...timestamps,
});
