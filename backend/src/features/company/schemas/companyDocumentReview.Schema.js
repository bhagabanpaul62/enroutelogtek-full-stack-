import { pgEnum, pgTable, uuid, date, timestamp } from 'drizzle-orm/pg-core';
import { companies } from './company.Schema.js';
import { documents } from '#features/document/schemas/documents.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';

export const documentReviewStatus = pgEnum('document_review_status', [
    'pending',
    'approved',
    'rejected',
]);

// One row per replaced compliance document: its review status and expiry. Documents uploaded at
// registration have no row; they count as approved once the company is approved.
export const companyDocumentReviews = pgTable('company_document_reviews', {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
        .notNull()
        .unique()
        .references(() => documents.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
        .notNull()
        .references(() => companies.id),
    status: documentReviewStatus('status').notNull().default('pending'),
    expiresOn: date('expires_on'),
    replacedBy: uuid('replaced_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
