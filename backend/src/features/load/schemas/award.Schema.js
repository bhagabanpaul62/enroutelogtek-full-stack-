import { index, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';
import { loads } from './load.Schema.js';
import { bids } from './bid.Schema.js';
import { AWARD_STATUSES } from '../load.constants.js';

export const awardStatus = pgEnum('award_status', AWARD_STATUSES);

/**
 * The customer's pick. pending until the transporter answers; declined or expired sends the
 * load back to closed so the customer can award again, and a new row is created then.
 * The accepted award also carries the truck and driver the transporter assigns (simple
 * version of the trip step until the Trips module exists).
 */
export const awards = pgTable(
    'awards',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        loadId: uuid('load_id')
            .notNull()
            .references(() => loads.id),
        bidId: uuid('bid_id')
            .notNull()
            .references(() => bids.id),
        transporterCompanyId: uuid('transporter_company_id')
            .notNull()
            .references(() => companies.id),
        awardedByUserId: uuid('awarded_by_user_id')
            .notNull()
            .references(() => users.id),
        reason: varchar('reason', { length: 300 }),
        status: awardStatus('status').notNull().default('pending'),
        acceptBy: timestamp('accept_by').notNull(),
        respondedAt: timestamp('responded_at'),
        respondedByUserId: uuid('responded_by_user_id').references(() => users.id),
        vehicleNumber: varchar('vehicle_number', { length: 20 }),
        driverName: varchar('driver_name', { length: 100 }),
        driverPhone: varchar('driver_phone', { length: 15 }),
        assignedAt: timestamp('assigned_at'),
        ...timestamps,
    },
    (table) => [
        index('awards_load_idx').on(table.loadId, table.status),
        // The clock job: pending awards past their accept-by time.
        index('awards_pending_idx').on(table.status, table.acceptBy),
    ],
);
