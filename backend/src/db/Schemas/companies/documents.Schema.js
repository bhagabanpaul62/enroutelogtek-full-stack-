import { integer, pgEnum, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { companies } from './company.Schema';
import { timestamps } from '../schema.Helper.Colomus/columns.Hemper';

export const documentType = pgEnum('document_type', [
  'gst',
  'pan',
  'logo',
  'rc',
  'insurance',
  'paymentProof',
  'pod',
  'lr',
  'indent',
]);

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').references(() => {
    companies.id;
  }),
  documentType: documentType('document_type'),
  fileUrl: varchar('file_url', { length: 1000 }).notNull(),
  ...timestamps,
});
