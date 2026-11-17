import { boolean, check, integer, pgTable, text, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '#features/auth/schemas/users.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';

/**
 * A plan the platform admin sells. No price lives in code: every number here is entered by the
 * admin. Money is in paise. A plan is deactivated, never deleted, because subscriptions and
 * payment submissions keep a snapshot of it and point back here.
 */
export const subscriptionPlans = pgTable(
    'subscription_plans',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        name: varchar('name', { length: 100 }).notNull(),
        description: text('description'),
        monthlyPricePaise: integer('monthly_price_paise').notNull(),
        includedSeats: integer('included_seats').notNull(),
        // Price of one extra seat for one month.
        extraSeatPricePaise: integer('extra_seat_price_paise').notNull(),
        // Billing periods (months) a company may buy this plan for; the allowed set is in constants.
        billingPeriods: integer('billing_periods').array().notNull().default(sql`'{1,3,12}'::integer[]`),
        isActive: boolean('is_active').notNull().default(true),
        createdByUserId: uuid('created_by_user_id')
            .notNull()
            .references(() => users.id),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('subscription_plans_name_idx').on(sql`lower(${table.name})`),
        check('subscription_plans_money_chk', sql`${table.monthlyPricePaise} >= 0 AND ${table.extraSeatPricePaise} >= 0`),
        check('subscription_plans_seats_chk', sql`${table.includedSeats} >= 1`),
    ],
);
