import { index, uuid, pgEnum, pgTable, varchar } from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';
import { users } from '#features/auth/schemas/users.Schema.js';

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
    'permit',
    'fitness',
    'puc',
    'licence',
    'eway_bill',
    'weighbridge',
    'invoice_copy',
    'discrepancy_photo',
    'closure_sheet',
]);
export const documents = pgTable('documents', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    companyId: uuid('company_id').references(() => companies.id),
    documentType: documentType('document_type'),
    fileUrl: varchar('file_url', { length: 1000 }).notNull(),
    // What the file belongs to: vehicle | driver | trip | discrepancy | load. Null = company/user doc.
    entityType: varchar('entity_type', { length: 20 }),
    entityId: uuid('entity_id'),
    ...timestamps,
}, (table) => [index('documents_entity_idx').on(table.entityType, table.entityId)]);
