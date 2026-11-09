import { index, integer, numeric, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';
import { loads } from './load.Schema.js';
import { MARGIN_TYPES } from '../load.constants.js';

export const marginType = pgEnum('margin_type', MARGIN_TYPES);

const money = (name) => numeric(name, { precision: 12, scale: 2, mode: 'number' });

/**
 * One transporter's standing on one load: its latest amount, how many attempts it has used
 * and its rank among all bids. The attempts themselves are in bid_attempts.
 */
export const bids = pgTable(
    'bids',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        loadId: uuid('load_id')
            .notNull()
            .references(() => loads.id),
        transporterCompanyId: uuid('transporter_company_id')
            .notNull()
            .references(() => companies.id),
        attemptsUsed: integer('attempts_used').notNull().default(0),
        currentAmount: money('current_amount').notNull(),
        currentRank: integer('current_rank'),
        lastAttemptAt: timestamp('last_attempt_at').notNull(),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('bids_load_transporter_unique').on(table.loadId, table.transporterCompanyId),
        // The customer's bid board and the ranking query: all bids of one load by amount.
        index('bids_load_amount_idx').on(table.loadId, table.currentAmount),
    ],
);

/** Every attempt, kept forever: the calculator inputs, the result and the rank it earned at the time. */
export const bidAttempts = pgTable(
    'bid_attempts',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        bidId: uuid('bid_id')
            .notNull()
            .references(() => bids.id),
        loadId: uuid('load_id')
            .notNull()
            .references(() => loads.id),
        transporterCompanyId: uuid('transporter_company_id')
            .notNull()
            .references(() => companies.id),
        attemptNumber: integer('attempt_number').notNull(),
        baseRate: money('base_rate').notNull(),
        marginType: marginType('margin_type').notNull(),
        marginValue: money('margin_value').notNull(),
        finalAmount: money('final_amount').notNull(),
        rankAtSubmit: integer('rank_at_submit'),
        submittedByUserId: uuid('submitted_by_user_id').references(() => users.id),
        ...timestamps,
    },
    (table) => [uniqueIndex('bid_attempts_unique').on(table.bidId, table.attemptNumber)],
);
