import { uuid, pgEnum, pgTable, varchar } from 'drizzle-orm/pg-core';
import { companies } from './company.Schema.js';
import { timestamps } from '../schema.Helper.Columns/column.Helper.js';
import { users } from '../auth/users.Schema.js';

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
    'term&condition',
    'profileImage',
]);
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId:uuid('userId').references(()=> users.id),
  companyId: uuid('company_id').references(() => companies.id),
  documentType: documentType('document_type'),
  fileUrl: varchar('file_url', { length: 1000 }).notNull(),
  ...timestamps,
});
