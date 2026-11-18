import { check, index, integer, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from '#features/company/schemas/company.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';
import { subscriptionPlans } from './subscriptionPlan.Schema.js';

export const subscriptionKind = pgEnum('subscription_kind', ['trial', 'paid']);
export const subscriptionStatus = pgEnum('subscription_status', [
    'pending_payment',
    'active',
    'grace',
    'expired',
    'cancelled',
]);

/**
 * The one live entitlement of a company (unique per company). It is changed only inside an
 * approval, a trial start, the expiry clock or a cancel, and each change writes a
 * subscription_events row. Plan name, prices and seats are copied here so later edits to the
 * plan never change what a company bought. `status` is a cache for lists: the access decision is
 * always recomputed from the dates (see subscription.rules.js).
 */
export const companySubscriptions = pgTable(
    'company_subscriptions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        companyId: uuid('company_id')
            .notNull()
            .references(() => companies.id),
        kind: subscriptionKind('kind').notNull(),
        status: subscriptionStatus('status').notNull(),
        // Null for a trial.
        planId: uuid('plan_id').references(() => subscriptionPlans.id),
        planName: varchar('plan_name', { length: 100 }),
        monthlyPricePaise: integer('monthly_price_paise'),
        extraSeatPricePaise: integer('extra_seat_price_paise'),
        includedSeats: integer('included_seats').notNull().default(0),
        extraSeats: integer('extra_seats').notNull().default(0),
        // Null for a trial.
        periodMonths: integer('period_months'),
        // Null only while pending_payment (trial switched off and nothing approved yet).
        startsAt: timestamp('starts_at'),
        endsAt: timestamp('ends_at'),
        graceEndsAt: timestamp('grace_ends_at'),
        // The approved submission that last changed this row; null for a trial.
        lastSubmissionId: uuid('last_submission_id'),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('company_subscriptions_company_idx').on(table.companyId),
        index('company_subscriptions_clock_idx').on(table.status, table.endsAt),
        check('company_subscriptions_seats_chk', sql`${table.includedSeats} >= 0 AND ${table.extraSeats} >= 0`),
    ],
);
