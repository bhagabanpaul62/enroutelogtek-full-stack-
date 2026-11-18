import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from '#features/company/schemas/company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';
import { companySubscriptions } from './companySubscription.Schema.js';
import { paymentSubmissions } from './paymentSubmission.Schema.js';
import { subscriptionPlans } from './subscriptionPlan.Schema.js';

/**
 * Every seat-allowance change, written in the same transaction as the change. Totals are
 * included + extra. `reason`: trial_started | plan_approved | renewal_approved | extra_seats_approved.
 */
export const seatChanges = pgTable(
    'seat_changes',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        companyId: uuid('company_id')
            .notNull()
            .references(() => companies.id),
        subscriptionId: uuid('subscription_id')
            .notNull()
            .references(() => companySubscriptions.id),
        submissionId: uuid('submission_id').references(() => paymentSubmissions.id),
        reason: varchar('reason', { length: 40 }).notNull(),
        includedBefore: integer('included_before').notNull(),
        includedAfter: integer('included_after').notNull(),
        extraBefore: integer('extra_before').notNull(),
        extraAfter: integer('extra_after').notNull(),
        // Null for the system (trial start).
        actorUserId: uuid('actor_user_id').references(() => users.id),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [index('seat_changes_company_idx').on(table.companyId, table.createdAt)],
);

/**
 * The audit trail of billing: who did what and when. `eventType`: trial_started |
 * submission_created | submission_approved | submission_rejected | status_changed | cancelled |
 * plan_created | plan_updated. Company events carry companyId; plan events carry planId only.
 * `details` holds before/after dates, status and amounts. Actor is null for the clock.
 */
export const subscriptionEvents = pgTable(
    'subscription_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        companyId: uuid('company_id').references(() => companies.id),
        subscriptionId: uuid('subscription_id').references(() => companySubscriptions.id),
        submissionId: uuid('submission_id').references(() => paymentSubmissions.id),
        planId: uuid('plan_id').references(() => subscriptionPlans.id),
        eventType: varchar('event_type', { length: 40 }).notNull(),
        actorUserId: uuid('actor_user_id').references(() => users.id),
        details: jsonb('details'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [
        index('subscription_events_company_idx').on(table.companyId, table.createdAt),
        // A submission can be approved once, whatever the code does.
        uniqueIndex('subscription_events_approved_once_idx')
            .on(table.submissionId)
            .where(sql`${table.eventType} = 'submission_approved'`),
    ],
);
