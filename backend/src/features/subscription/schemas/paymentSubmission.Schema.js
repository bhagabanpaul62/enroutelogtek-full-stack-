import {
    check,
    date,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from '#features/company/schemas/company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';
import { documents } from '#features/document/schemas/documents.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';
import { subscriptionPlans } from './subscriptionPlan.Schema.js';

export const submissionPurpose = pgEnum('submission_purpose', ['new', 'renewal', 'extra_seats']);
export const submissionStatus = pgEnum('submission_status', ['submitted', 'approved', 'rejected']);

/**
 * One manual payment a company reports: plan, period, seats, the amount (computed by the server,
 * never taken from the client), a proof file and a bank reference. The platform admin approves or
 * rejects it. Approving is guarded three ways so it can happen once: the status is changed with
 * `WHERE status = 'submitted'`, `proof_document_id` is unique, and subscription_events has a unique
 * `submission_approved` row per submission.
 */
export const paymentSubmissions = pgTable(
    'payment_submissions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        companyId: uuid('company_id')
            .notNull()
            .references(() => companies.id),
        submittedByUserId: uuid('submitted_by_user_id')
            .notNull()
            .references(() => users.id),
        purpose: submissionPurpose('purpose').notNull(),
        planId: uuid('plan_id')
            .notNull()
            .references(() => subscriptionPlans.id),
        // Months bought. For extra_seats it is the months left on the current term, rounded up.
        periodMonths: integer('period_months').notNull(),
        // new/renewal: extra seats for the whole term. extra_seats: seats added now.
        extraSeats: integer('extra_seats').notNull().default(0),
        amountPaise: integer('amount_paise').notNull(),
        // Prices and seats the amount was computed from: { planName, monthlyPricePaise,
        // extraSeatPricePaise, includedSeats, baseAmountPaise, extraAmountPaise, remainingDays }.
        // Approval copies the plan figures into company_subscriptions.
        priceSnapshot: jsonb('price_snapshot').notNull(),
        proofDocumentId: uuid('proof_document_id')
            .notNull()
            .references(() => documents.id),
        referenceNo: varchar('reference_no', { length: 100 }).notNull(),
        paidOn: date('paid_on'),
        status: submissionStatus('status').notNull().default('submitted'),
        reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id),
        reviewedAt: timestamp('reviewed_at'),
        // Required when rejected; optional note when approved.
        reviewNote: text('review_note'),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('payment_submissions_proof_idx').on(table.proofDocumentId),
        // One open submission per company: no two pending payments to reconcile.
        uniqueIndex('payment_submissions_open_idx')
            .on(table.companyId)
            .where(sql`${table.status} = 'submitted'`),
        index('payment_submissions_company_idx').on(table.companyId, table.createdAt),
        index('payment_submissions_review_idx').on(table.status, table.createdAt),
        check('payment_submissions_amount_chk', sql`${table.amountPaise} >= 0 AND ${table.extraSeats} >= 0`),
        check(
            'payment_submissions_review_chk',
            sql`${table.status} = 'submitted' OR (${table.reviewedByUserId} IS NOT NULL AND ${table.reviewedAt} IS NOT NULL)`,
        ),
    ],
);
