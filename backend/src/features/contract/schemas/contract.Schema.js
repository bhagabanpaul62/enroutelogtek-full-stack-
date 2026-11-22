import {
    bigint,
    check,
    date,
    index,
    integer,
    jsonb,
    numeric,
    pgEnum,
    pgTable,
    serial,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from '#features/company/schemas/company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';
import { vehicleTypes } from '#features/load/schemas/master.Schema.js';
import { loads } from '#features/load/schemas/load.Schema.js';
import { rfqs, rfqLanes, rfqRateBasis } from '#features/rfq/schemas/rfq.Schema.js';

const paise = (name) => bigint(name, { mode: 'number' });

export const CONTRACT_STATUSES = ['active', 'amending', 'expired', 'cancelled'];
export const AMENDMENT_STATUSES = ['proposed', 'accepted', 'rejected'];
export const INDENT_STATUSES = ['requested', 'acknowledged', 'declined', 'cancelled', 'fulfilled'];

export const contractStatus = pgEnum('contract_status', CONTRACT_STATUSES);
export const amendmentStatus = pgEnum('amendment_status', AMENDMENT_STATUSES);
export const indentStatus = pgEnum('indent_status', INDENT_STATUSES);

/**
 * The agreed business: exactly one per (RFQ, transporter), created when the transporter accepts
 * its lane awards. validFrom/validTo start as the RFQ period; amendments may change validTo/terms
 * (the before/after of every change is kept in contract_amendments).
 */
export const contracts = pgTable(
    'contracts',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        // Human number CON-2026-000042.
        contractSeq: serial('contract_seq').notNull().unique(),
        rfqId: uuid('rfq_id')
            .notNull()
            .references(() => rfqs.id),
        customerCompanyId: uuid('customer_company_id')
            .notNull()
            .references(() => companies.id),
        transporterCompanyId: uuid('transporter_company_id')
            .notNull()
            .references(() => companies.id),
        status: contractStatus('status').notNull().default('active'),
        validFrom: date('valid_from', { mode: 'string' }).notNull(),
        validTo: date('valid_to', { mode: 'string' }).notNull(),
        // Commercial terms snapshot (rfqs.terms at acceptance); changed only via an accepted amendment.
        terms: jsonb('terms').notNull().default({}),
        paymentTerms: varchar('payment_terms', { length: 200 }),
        // 1 at creation, +1 per accepted amendment.
        version: integer('version').notNull().default(1),
        acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id),
        // Cancellation with notice: status flips to cancelled now; indents may still be placed for
        // pickups before cancelEffectiveOn.
        cancelledAt: timestamp('cancelled_at'),
        cancelledByCompanyId: uuid('cancelled_by_company_id').references(() => companies.id),
        cancelReason: varchar('cancel_reason', { length: 300 }),
        cancelNoticeDays: integer('cancel_notice_days'),
        cancelEffectiveOn: date('cancel_effective_on', { mode: 'string' }),
        expiredAt: timestamp('expired_at'),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('contracts_rfq_transporter_unique').on(table.rfqId, table.transporterCompanyId),
        index('contracts_customer_idx').on(table.customerCompanyId, table.status, table.createdAt),
        index('contracts_transporter_idx').on(table.transporterCompanyId, table.status, table.createdAt),
        // The clock: active contracts past validTo.
        index('contracts_expiry_idx').on(table.status, table.validTo),
    ],
);

/** A lane of a contract: identity + the immutable snapshot of the RFQ lane. Never updated. */
export const contractLanes = pgTable(
    'contract_lanes',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        contractId: uuid('contract_id')
            .notNull()
            .references(() => contracts.id),
        rfqLaneId: uuid('rfq_lane_id')
            .notNull()
            .references(() => rfqLanes.id),
        laneNo: integer('lane_no').notNull(),
        originPinCode: varchar('origin_pin_code', { length: 6 }).notNull(),
        originCity: varchar('origin_city', { length: 100 }).notNull(),
        originState: varchar('origin_state', { length: 100 }),
        destPinCode: varchar('dest_pin_code', { length: 6 }).notNull(),
        destCity: varchar('dest_city', { length: 100 }).notNull(),
        destState: varchar('dest_state', { length: 100 }),
        vehicleTypeId: uuid('vehicle_type_id')
            .notNull()
            .references(() => vehicleTypes.id),
        rateBasis: rfqRateBasis('rate_basis').notNull(),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('contract_lanes_unique').on(table.contractId, table.rfqLaneId),
        index('contract_lanes_contract_idx').on(table.contractId),
    ],
);

/**
 * Rate and monthly volume of a lane over time, insert-only. Version 1 (effectiveFrom = validFrom)
 * is the award snapshot. An accepted amendment adds a row; the rate for a pickup date is the row
 * with the greatest effectiveFrom <= that date.
 */
export const contractLaneTerms = pgTable(
    'contract_lane_terms',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        contractLaneId: uuid('contract_lane_id')
            .notNull()
            .references(() => contractLanes.id),
        version: integer('version').notNull(),
        ratePaise: paise('rate_paise').notNull(),
        monthlyVolumeTrucks: integer('monthly_volume_trucks').notNull(),
        effectiveFrom: date('effective_from', { mode: 'string' }).notNull(),
        amendmentId: uuid('amendment_id'), // null for the award snapshot; plain uuid avoids a cycle
        ...timestamps,
    },
    (table) => [
        uniqueIndex('contract_lane_terms_unique').on(table.contractLaneId, table.version),
        index('contract_lane_terms_effective_idx').on(table.contractLaneId, table.effectiveFrom),
        check('contract_lane_terms_positive', sql`${table.ratePaise} > 0 AND ${table.monthlyVolumeTrucks} >= 1`),
    ],
);

/**
 * A proposed change to a live contract by either party; the counterpart accepts or rejects.
 * changes = { validTo?, terms?, paymentTerms?, lanes:[{ contractLaneId, ratePaise?, monthlyVolumeTrucks? }] }
 * before/after hold the full affected values so each version stays readable. One open proposal
 * at a time per contract (contract.status = 'amending').
 */
export const contractAmendments = pgTable(
    'contract_amendments',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        contractId: uuid('contract_id')
            .notNull()
            .references(() => contracts.id),
        proposedByCompanyId: uuid('proposed_by_company_id')
            .notNull()
            .references(() => companies.id),
        proposedByUserId: uuid('proposed_by_user_id')
            .notNull()
            .references(() => users.id),
        status: amendmentStatus('status').notNull().default('proposed'),
        changes: jsonb('changes').notNull(),
        before: jsonb('before'),
        after: jsonb('after'),
        effectiveFrom: date('effective_from', { mode: 'string' }).notNull(),
        note: varchar('note', { length: 500 }),
        decidedByUserId: uuid('decided_by_user_id').references(() => users.id),
        decidedAt: timestamp('decided_at'),
        decisionNote: varchar('decision_note', { length: 300 }),
        // Contract version this amendment produced (set when accepted).
        resultingVersion: integer('resulting_version'),
        ...timestamps,
    },
    (table) => [
        index('contract_amendments_contract_idx').on(table.contractId, table.createdAt),
        uniqueIndex('contract_amendments_one_open_unique')
            .on(table.contractId)
            .where(sql`${table.status} = 'proposed'`),
    ],
);

/**
 * A dated dispatch request against one contract lane ("Daily"). Acknowledging it creates a
 * loads row (kind 'contract') + an accepted award so the trip machinery runs unchanged.
 * Consumption of the lane = trucks of acknowledged/fulfilled indents by pickup month.
 */
export const contractIndents = pgTable(
    'contract_indents',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        // Human number IND-2026-000042.
        indentSeq: serial('indent_seq').notNull().unique(),
        contractId: uuid('contract_id')
            .notNull()
            .references(() => contracts.id),
        contractLaneId: uuid('contract_lane_id')
            .notNull()
            .references(() => contractLanes.id),
        customerCompanyId: uuid('customer_company_id')
            .notNull()
            .references(() => companies.id),
        transporterCompanyId: uuid('transporter_company_id')
            .notNull()
            .references(() => companies.id),
        status: indentStatus('status').notNull().default('requested'),
        trucks: integer('trucks').notNull(),
        pickupDate: date('pickup_date', { mode: 'string' }).notNull(),
        pickupTimeFrom: varchar('pickup_time_from', { length: 5 }),
        pickupTimeTo: varchar('pickup_time_to', { length: 5 }),
        pickupAddress: varchar('pickup_address', { length: 300 }),
        pickupContactName: varchar('pickup_contact_name', { length: 100 }),
        pickupContactPhone: varchar('pickup_contact_phone', { length: 15 }),
        dropAddress: varchar('drop_address', { length: 300 }),
        dropContactName: varchar('drop_contact_name', { length: 100 }),
        dropContactPhone: varchar('drop_contact_phone', { length: 15 }),
        weightTons: numeric('weight_tons', { precision: 10, scale: 2, mode: 'number' }),
        // PTL contracts only: the cargo, as on an Ad Hoc PTL load. [{ count, lengthCm, widthCm, heightCm, weightKg? }]
        packageDims: jsonb('package_dims'),
        actualWeightKg: numeric('actual_weight_kg', { precision: 10, scale: 2, mode: 'number' }),
        notes: text('notes'),
        // Client-generated; a retried request with the same key returns the same indent.
        idempotencyKey: varchar('idempotency_key', { length: 64 }).notNull(),
        // Trucks by which this request pushes the month's consumption over the monthly volume (0 = within; warn only).
        overVolumeBy: integer('over_volume_by').notNull().default(0),
        // Frozen at acknowledge: the rate and contract version used.
        ratePaise: paise('rate_paise'),
        termVersion: integer('term_version'),
        loadId: uuid('load_id').references(() => loads.id),
        requestedByUserId: uuid('requested_by_user_id')
            .notNull()
            .references(() => users.id),
        respondedByUserId: uuid('responded_by_user_id').references(() => users.id),
        respondedAt: timestamp('responded_at'),
        declineReason: varchar('decline_reason', { length: 300 }),
        cancelReason: varchar('cancel_reason', { length: 300 }),
        fulfilledAt: timestamp('fulfilled_at'),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('contract_indents_idem_unique').on(table.contractId, table.idempotencyKey),
        index('contract_indents_contract_idx').on(table.contractId, table.pickupDate),
        index('contract_indents_transporter_idx').on(table.transporterCompanyId, table.status, table.pickupDate),
        index('contract_indents_customer_idx').on(table.customerCompanyId, table.status, table.pickupDate),
        // Consumption query: lane + month.
        index('contract_indents_lane_idx').on(table.contractLaneId, table.pickupDate, table.status),
        check('contract_indents_trucks_positive', sql`${table.trucks} >= 1`),
    ],
);

/** Insert-only audit log of a contract and its indents (indentId set for indent events). */
export const contractEvents = pgTable(
    'contract_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        contractId: uuid('contract_id')
            .notNull()
            .references(() => contracts.id),
        indentId: uuid('indent_id').references(() => contractIndents.id),
        type: varchar('type', { length: 50 }).notNull(),
        fromStatus: varchar('from_status', { length: 30 }),
        toStatus: varchar('to_status', { length: 30 }),
        actorUserId: uuid('actor_user_id').references(() => users.id),
        actorCompanyId: uuid('actor_company_id').references(() => companies.id),
        note: varchar('note', { length: 300 }),
        data: jsonb('data').notNull().default({}),
        ...timestamps,
    },
    (table) => [index('contract_events_contract_idx').on(table.contractId, table.createdAt)],
);
