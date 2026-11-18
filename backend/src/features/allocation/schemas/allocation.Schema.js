import { sql } from 'drizzle-orm';
import {
    bigint,
    boolean,
    check,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';
import { loads } from '#features/load/schemas/load.Schema.js';
import { awards } from '#features/load/schemas/award.Schema.js';
import { trips } from '#features/trip/schemas/trip.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';

const paise = (name) => bigint(name, { mode: 'number' });

export const ALLOCATION_STATUSES = ['offered', 'accepted', 'declined', 'expired', 'withdrawn'];
// Statuses that still hold their trucks: an offer waiting for an answer, or an accepted one.
export const ALLOCATION_ACTIVE_STATUSES = ['offered', 'accepted'];

export const allocationStatus = pgEnum('allocation_status', ALLOCATION_STATUSES);

/**
 * One offer of N trucks from company A to company B, taken from an accepted award.
 * depth 1 = the award's transporter offers (to a fleet owner or broker).
 * depth 2 = a broker that accepted a depth-1 offer re-offers part of it (to a fleet owner or
 * transporter). Nothing goes deeper. Own-fleet trucks have no row: a truck with no live offer
 * stays with the company that holds it.
 * ratePerTruckPaise is the price the offerer pays the recipient per truck. Only the two companies
 * on the row (and platform admins) may read it; the customer never sees it.
 */
export const allocations = pgTable(
    'allocations',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        awardId: uuid('award_id').notNull().references(() => awards.id),
        loadId: uuid('load_id').notNull().references(() => loads.id),
        // The accepted depth-1 allocation a broker re-offers from; null at depth 1.
        parentAllocationId: uuid('parent_allocation_id').references(() => allocations.id),
        depth: integer('depth').notNull().default(1),
        fromCompanyId: uuid('from_company_id').notNull().references(() => companies.id),
        toCompanyId: uuid('to_company_id').notNull().references(() => companies.id),
        // Kept for display and rules: the recipient's company type when offered.
        toCompanyType: varchar('to_company_type', { length: 20 }).notNull(),
        quantity: integer('quantity').notNull(),
        ratePerTruckPaise: paise('rate_per_truck_paise').notNull(),
        status: allocationStatus('status').notNull().default('offered'),
        note: varchar('note', { length: 300 }),
        respondBy: timestamp('respond_by').notNull(),
        respondedAt: timestamp('responded_at'),
        respondedByUserId: uuid('responded_by_user_id').references(() => users.id),
        decisionNote: varchar('decision_note', { length: 300 }), // decline reason
        createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
        ...timestamps,
    },
    (table) => [
        index('allocations_award_idx').on(table.awardId, table.status),
        index('allocations_from_idx').on(table.fromCompanyId, table.status, table.createdAt),
        index('allocations_to_idx').on(table.toCompanyId, table.status, table.createdAt),
        // The clock job: offers past their respond-by time.
        index('allocations_pending_idx').on(table.status, table.respondBy),
        check('allocations_quantity_positive', sql`${table.quantity} >= 1`),
        check('allocations_rate_positive', sql`${table.ratePerTruckPaise} > 0`),
        check('allocations_depth_valid', sql`${table.depth} in (1, 2)`),
        check('allocations_not_self', sql`${table.fromCompanyId} <> ${table.toCompanyId}`),
        check(
            'allocations_status_valid',
            sql`${table.status} in ('offered','accepted','declined','expired','withdrawn')`,
        ),
    ],
);

/**
 * Which trucks (trips) an allocation covers. This table is the quantity guard: a trip can be in
 * only one live allocation per depth (partial unique index), so the offered trucks of an award can
 * never add up to more than the award's trucks, even under concurrent offers. `active` is turned
 * off (never the row deleted) when the allocation is declined, expired or withdrawn.
 */
export const allocationTrips = pgTable(
    'allocation_trips',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        allocationId: uuid('allocation_id').notNull().references(() => allocations.id),
        tripId: uuid('trip_id').notNull().references(() => trips.id),
        depth: integer('depth').notNull(),
        active: boolean('active').notNull().default(true),
        releasedAt: timestamp('released_at'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('allocation_trips_pair_unique').on(table.allocationId, table.tripId),
        uniqueIndex('allocation_trips_live_unique').on(table.tripId, table.depth).where(sql`${table.active}`),
        index('allocation_trips_trip_idx').on(table.tripId),
    ],
);

/** History of an allocation: created, accepted, declined, expired, withdrawn. Insert only. */
export const allocationEvents = pgTable(
    'allocation_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        allocationId: uuid('allocation_id').notNull().references(() => allocations.id),
        type: varchar('type', { length: 30 }).notNull(), // offered | accepted | declined | expired | withdrawn | reoffered
        fromStatus: varchar('from_status', { length: 20 }),
        toStatus: varchar('to_status', { length: 20 }),
        actorUserId: uuid('actor_user_id').references(() => users.id), // null = system
        actorCompanyId: uuid('actor_company_id').references(() => companies.id),
        note: varchar('note', { length: 300 }),
        data: jsonb('data').notNull().default({}),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [index('allocation_events_allocation_idx').on(table.allocationId, table.createdAt)],
);
