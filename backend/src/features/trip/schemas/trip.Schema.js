import { sql } from 'drizzle-orm';
import {
    bigint,
    check,
    index,
    integer,
    jsonb,
    numeric,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';
import { loads } from '#features/load/schemas/load.Schema.js';
import { awards } from '#features/load/schemas/award.Schema.js';
import { vehicles, drivers } from '#features/fleet/schemas/fleet.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';
import { TRIP_STATUSES } from '../trip.constants.js';

const paise = (name) => bigint(name, { mode: 'number' });

/** One truck carrying (part of) a load. A load with vehicle_count 3 gets 3 trips (seq_no 1..3). */
export const trips = pgTable(
    'trips',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        loadId: uuid('load_id').notNull().references(() => loads.id),
        awardId: uuid('award_id').notNull().references(() => awards.id),
        seqNo: integer('seq_no').notNull(),
        // The company that owns the award (and is paid), and the company that actually moves the truck.
        // Equal until Wave 3 allocation hands a trip to a broker / fleet owner.
        transporterCompanyId: uuid('transporter_company_id').notNull().references(() => companies.id),
        executorCompanyId: uuid('executor_company_id').notNull().references(() => companies.id),
        // Set when an accepted allocation hands the trip to another company: the allocation that
        // made this company the executor and the rate per truck it agreed (earnings, ENR-035).
        // Null while the transporter runs the trip itself. No FK to allocations: avoids a schema cycle.
        executorAllocationId: uuid('executor_allocation_id'),
        executorRatePaise: paise('executor_rate_paise'),
        vehicleId: uuid('vehicle_id').references(() => vehicles.id),
        driverId: uuid('driver_id').references(() => drivers.id),
        status: varchar('status', { length: 20 }).notNull().default('planned'),
        expectedPlacementAt: timestamp('expected_placement_at'),
        loadedWeightKg: numeric('loaded_weight_kg', { precision: 10, scale: 2, mode: 'number' }),
        lrNumber: varchar('lr_number', { length: 40 }),
        ewayBillNumber: varchar('eway_bill_number', { length: 20 }),
        ewayBillValidUntil: timestamp('eway_bill_valid_until'),
        etaAt: timestamp('eta_at'),
        delayReason: varchar('delay_reason', { length: 300 }),
        // 'clean' or 'remarks'; remarks text in podRemarks.
        podCondition: varchar('pod_condition', { length: 10 }),
        podRemarks: varchar('pod_remarks', { length: 500 }),
        // AJ-27: who signed for the goods, and when.
        receivedByName: varchar('received_by_name', { length: 150 }),
        receivedByPhone: varchar('received_by_phone', { length: 15 }),
        receivedAt: timestamp('received_at'),
        // AJ-32 / Q-15: the transporter's GST declaration for the closure sheet: 'rcm' | 'forward'.
        gstTreatment: varchar('gst_treatment', { length: 10 }),
        cancelReason: varchar('cancel_reason', { length: 300 }),
        // Milestone timestamps
        reportedAt: timestamp('reported_at'), // truck arrived at pickup
        loadingStartedAt: timestamp('loading_started_at'),
        loadedAt: timestamp('loaded_at'),
        departedAt: timestamp('departed_at'), // in_transit
        reachedDropAt: timestamp('reached_drop_at'),
        unloadingStartedAt: timestamp('unloading_started_at'),
        deliveredAt: timestamp('delivered_at'), // POD uploaded
        completedAt: timestamp('completed_at'),
        cancelledAt: timestamp('cancelled_at'),
        // Auto-complete: 7 days after deliveredAt, warning 24 h before (PRD Q-16).
        autoCompleteAt: timestamp('auto_complete_at'),
        autoCompleteWarnedAt: timestamp('auto_complete_warned_at'),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('trips_load_seq_idx').on(table.loadId, table.seqNo),
        index('trips_transporter_idx').on(table.transporterCompanyId, table.status),
        index('trips_executor_idx').on(table.executorCompanyId, table.status),
        index('trips_clock_idx').on(table.status, table.autoCompleteAt),
        check('trips_status_valid', sql`${table.status} in (${sql.raw(TRIP_STATUSES.map((s) => `'${s}'`).join(','))})`),
    ],
);

/** History of a trip: every status change, note, location update. Insert only. */
export const tripEvents = pgTable(
    'trip_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        tripId: uuid('trip_id').notNull().references(() => trips.id),
        type: varchar('type', { length: 40 }).notNull(), // status | note | delay | location | charge | document | discrepancy | auto_complete_warning
        fromStatus: varchar('from_status', { length: 20 }),
        toStatus: varchar('to_status', { length: 20 }),
        actorUserId: uuid('actor_user_id').references(() => users.id), // null = system
        actorCompanyId: uuid('actor_company_id').references(() => companies.id),
        note: varchar('note', { length: 500 }),
        locationText: varchar('location_text', { length: 200 }),
        data: jsonb('data').notNull().default({}),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [index('trip_events_trip_idx').on(table.tripId, table.createdAt)],
);

/** Money lines on a trip. freight is the agreed rate (status approved from the start). */
export const tripCharges = pgTable(
    'trip_charges',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        tripId: uuid('trip_id').notNull().references(() => trips.id),
        kind: varchar('kind', { length: 12 }).notNull(), // freight | detention | labour | toll | other
        amountPaise: paise('amount_paise').notNull(),
        description: varchar('description', { length: 300 }),
        status: varchar('status', { length: 10 }).notNull().default('proposed'), // proposed | approved | rejected
        proposedByUserId: uuid('proposed_by_user_id').references(() => users.id),
        proposedByCompanyId: uuid('proposed_by_company_id').references(() => companies.id),
        decidedByUserId: uuid('decided_by_user_id').references(() => users.id),
        decidedAt: timestamp('decided_at'),
        decisionNote: varchar('decision_note', { length: 300 }),
        ...timestamps,
    },
    (table) => [
        index('trip_charges_trip_idx').on(table.tripId, table.status),
        check('trip_charges_amount_positive', sql`${table.amountPaise} > 0`),
    ],
);

/** Shortage or damage found at delivery (PRD Q-17: recorded only, settled outside). Photos in documents (entity_type 'discrepancy'). */
export const discrepancies = pgTable(
    'discrepancies',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        tripId: uuid('trip_id').notNull().references(() => trips.id),
        kind: varchar('kind', { length: 10 }).notNull(), // shortage | damage | rejected
        quantity: numeric('quantity', { precision: 10, scale: 2, mode: 'number' }),
        unit: varchar('unit', { length: 20 }), // packages | kg | tons
        note: text('note'),
        raisedByUserId: uuid('raised_by_user_id').references(() => users.id),
        raisedByCompanyId: uuid('raised_by_company_id').references(() => companies.id),
        ...timestamps,
    },
    (table) => [index('discrepancies_trip_idx').on(table.tripId)],
);

/** Stars one company gives another after a load completes. One per direction per load. */
export const ratings = pgTable(
    'ratings',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        loadId: uuid('load_id').notNull().references(() => loads.id),
        fromCompanyId: uuid('from_company_id').notNull().references(() => companies.id),
        toCompanyId: uuid('to_company_id').notNull().references(() => companies.id),
        givenByUserId: uuid('given_by_user_id').references(() => users.id),
        stars: integer('stars').notNull(),
        comment: varchar('comment', { length: 500 }),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('ratings_pair_load_idx').on(table.loadId, table.fromCompanyId, table.toCompanyId),
        check('ratings_stars_range', sql`${table.stars} between 1 and 5`),
    ],
);

/**
 * A transporter failed to place the truck by the expected time. The customer then decides
 * (PRD Q-12): re-award to the next ranked bid, or cancel. decision stays null until they do.
 */
export const placementMisses = pgTable(
    'placement_misses',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        tripId: uuid('trip_id').notNull().references(() => trips.id),
        loadId: uuid('load_id').notNull().references(() => loads.id),
        transporterCompanyId: uuid('transporter_company_id').notNull().references(() => companies.id),
        missedAt: timestamp('missed_at').defaultNow().notNull(),
        decision: varchar('decision', { length: 12 }), // re_award | cancel
        // AJ-36: 'late' (the clock found no truck) or 'executor_cancel' (the executor cancelled before placement).
        source: varchar('source', { length: 16 }).notNull().default('late'),
        reason: varchar('reason', { length: 300 }),
        decidedByUserId: uuid('decided_by_user_id').references(() => users.id),
        decidedAt: timestamp('decided_at'),
        ...timestamps,
    },
    (table) => [
        index('placement_misses_transporter_idx').on(table.transporterCompanyId),
        index('placement_misses_trip_idx').on(table.tripId),
    ],
);
