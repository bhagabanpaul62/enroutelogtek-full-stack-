import {
    bigint,
    check,
    date,
    index,
    integer,
    jsonb,
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

const paise = (name) => bigint(name, { mode: 'number' });

// Single source for the enum values; services and validations import these arrays.
export const RFQ_STATUSES = ['draft', 'open', 'closed', 'awarded', 'cancelled'];
export const RFQ_RATE_BASES = ['per_vehicle', 'per_ton', 'per_kg'];
export const LANE_AWARD_STATUSES = ['pending', 'accepted', 'declined', 'expired'];
export const RFQ_IMPORT_STATUSES = ['previewed', 'confirmed', 'discarded'];

export const rfqStatus = pgEnum('rfq_status', RFQ_STATUSES);
export const rfqRateBasis = pgEnum('rfq_rate_basis', RFQ_RATE_BASES);
export const laneAwardStatus = pgEnum('lane_award_status', LANE_AWARD_STATUSES);
export const rfqImportStatus = pgEnum('rfq_import_status', RFQ_IMPORT_STATUSES);

/**
 * A contract RFQ: one validity period and 1..n lanes the customer wants quoted. Money in paise.
 * draft -> open -> closed -> awarded; draft/open/closed -> cancelled. Ad Hoc loads never touch this table.
 */
export const rfqs = pgTable(
    'rfqs',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        // Human number RFQ-2026-000042, derived like load numbers.
        rfqSeq: serial('rfq_seq').notNull().unique(),
        status: rfqStatus('status').notNull().default('draft'),
        customerCompanyId: uuid('customer_company_id')
            .notNull()
            .references(() => companies.id),
        createdByUserId: uuid('created_by_user_id')
            .notNull()
            .references(() => users.id),
        title: varchar('title', { length: 150 }).notNull(),
        validFrom: date('valid_from', { mode: 'string' }),
        validTo: date('valid_to', { mode: 'string' }),
        closesAt: timestamp('closes_at'),
        // Same keys as load.rules snapshotTerms() commercial block: free time, detention, labour,
        // freight payer, toll. Copied onto the contract at acceptance.
        terms: jsonb('terms').notNull().default({}),
        paymentTerms: varchar('payment_terms', { length: 200 }),
        notes: text('notes'),
        // Draft invite list; publish copies it into rfq_invitations.
        inviteeCompanyIds: jsonb('invitee_company_ids').notNull().default([]),
        publishedAt: timestamp('published_at'),
        closedAt: timestamp('closed_at'),
        awardedAt: timestamp('awarded_at'),
        cancelledAt: timestamp('cancelled_at'),
        cancelReason: varchar('cancel_reason', { length: 300 }),
        extensionCount: integer('extension_count').notNull().default(0),
        closingSoonNotifiedAt: timestamp('closing_soon_notified_at'),
        ...timestamps,
    },
    (table) => [
        index('rfqs_customer_idx').on(table.customerCompanyId, table.status, table.createdAt),
        // The clock: open RFQs whose window has ended.
        index('rfqs_status_closes_idx').on(table.status, table.closesAt),
        check('rfqs_period_order', sql`${table.validFrom} IS NULL OR ${table.validTo} IS NULL OR ${table.validTo} >= ${table.validFrom}`),
    ],
);

/** One lane: a route + truck type + monthly volume. Editable only while the RFQ is draft. */
export const rfqLanes = pgTable(
    'rfq_lanes',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        rfqId: uuid('rfq_id')
            .notNull()
            .references(() => rfqs.id),
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
        monthlyVolumeTrucks: integer('monthly_volume_trucks').notNull(),
        rateBasis: rfqRateBasis('rate_basis').notNull().default('per_vehicle'),
        // Never returned to transporters.
        targetRatePaise: paise('target_rate_paise'),
        notes: varchar('notes', { length: 300 }),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('rfq_lanes_no_unique').on(table.rfqId, table.laneNo),
        check('rfq_lanes_volume_positive', sql`${table.monthlyVolumeTrucks} >= 1`),
    ],
);

/** Snapshot of who may quote, taken at publish (accepted connections only). */
export const rfqInvitations = pgTable(
    'rfq_invitations',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        rfqId: uuid('rfq_id')
            .notNull()
            .references(() => rfqs.id),
        transporterCompanyId: uuid('transporter_company_id')
            .notNull()
            .references(() => companies.id),
        invitedByUserId: uuid('invited_by_user_id').references(() => users.id),
        viewedAt: timestamp('viewed_at'),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('rfq_invitations_unique').on(table.rfqId, table.transporterCompanyId),
        index('rfq_invitations_transporter_idx').on(table.transporterCompanyId, table.createdAt),
    ],
);

/** A transporter's current quote on one lane. Revisions are in rfq_quote_revisions. */
export const rfqQuotes = pgTable(
    'rfq_quotes',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        rfqId: uuid('rfq_id')
            .notNull()
            .references(() => rfqs.id),
        laneId: uuid('lane_id')
            .notNull()
            .references(() => rfqLanes.id),
        transporterCompanyId: uuid('transporter_company_id')
            .notNull()
            .references(() => companies.id),
        currentRatePaise: paise('current_rate_paise').notNull(),
        revisionCount: integer('revision_count').notNull().default(1),
        lastSubmittedAt: timestamp('last_submitted_at').notNull(),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('rfq_quotes_unique').on(table.laneId, table.transporterCompanyId),
        index('rfq_quotes_rfq_idx').on(table.rfqId, table.transporterCompanyId),
        check('rfq_quotes_rate_positive', sql`${table.currentRatePaise} > 0`),
    ],
);

/** Every revision, kept forever (insert-only). revisionNumber starts at 1. */
export const rfqQuoteRevisions = pgTable(
    'rfq_quote_revisions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        quoteId: uuid('quote_id')
            .notNull()
            .references(() => rfqQuotes.id),
        revisionNumber: integer('revision_number').notNull(),
        ratePaise: paise('rate_paise').notNull(),
        note: varchar('note', { length: 300 }),
        submittedByUserId: uuid('submitted_by_user_id').references(() => users.id),
        ...timestamps,
    },
    (table) => [uniqueIndex('rfq_quote_revisions_unique').on(table.quoteId, table.revisionNumber)],
);

/**
 * The customer's pick for one lane. At most one live (pending/accepted) row per lane; declined or
 * expired rows stay as history and the lane can be awarded again. acceptBy is shared by all rows
 * created in one award call for the same transporter (the "bundle").
 */
export const rfqLaneAwards = pgTable(
    'rfq_lane_awards',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        rfqId: uuid('rfq_id')
            .notNull()
            .references(() => rfqs.id),
        laneId: uuid('lane_id')
            .notNull()
            .references(() => rfqLanes.id),
        quoteId: uuid('quote_id')
            .notNull()
            .references(() => rfqQuotes.id),
        transporterCompanyId: uuid('transporter_company_id')
            .notNull()
            .references(() => companies.id),
        // Rate frozen from the quote when awarded (later revisions are impossible after close anyway).
        ratePaise: paise('rate_paise').notNull(),
        status: laneAwardStatus('status').notNull().default('pending'),
        awardedByUserId: uuid('awarded_by_user_id')
            .notNull()
            .references(() => users.id),
        reason: varchar('reason', { length: 300 }),
        acceptBy: timestamp('accept_by').notNull(),
        respondedAt: timestamp('responded_at'),
        respondedByUserId: uuid('responded_by_user_id').references(() => users.id),
        declineReason: varchar('decline_reason', { length: 300 }),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('rfq_lane_awards_live_unique')
            .on(table.laneId)
            .where(sql`${table.status} IN ('pending', 'accepted')`),
        index('rfq_lane_awards_rfq_idx').on(table.rfqId, table.transporterCompanyId, table.status),
        // The clock: pending awards past accept-by.
        index('rfq_lane_awards_pending_idx').on(table.status, table.acceptBy),
    ],
);

/** Insert-only audit log of an RFQ; null actor = the clock. */
export const rfqEvents = pgTable(
    'rfq_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        rfqId: uuid('rfq_id')
            .notNull()
            .references(() => rfqs.id),
        type: varchar('type', { length: 50 }).notNull(),
        fromStatus: varchar('from_status', { length: 30 }),
        toStatus: varchar('to_status', { length: 30 }),
        actorUserId: uuid('actor_user_id').references(() => users.id),
        actorCompanyId: uuid('actor_company_id').references(() => companies.id),
        note: varchar('note', { length: 300 }),
        data: jsonb('data').notNull().default({}),
        ...timestamps,
    },
    (table) => [index('rfq_events_rfq_idx').on(table.rfqId, table.createdAt)],
);

/** One CSV upload: parsed rows + row errors, awaiting explicit confirmation. */
export const rfqImports = pgTable(
    'rfq_imports',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        customerCompanyId: uuid('customer_company_id')
            .notNull()
            .references(() => companies.id),
        createdByUserId: uuid('created_by_user_id')
            .notNull()
            .references(() => users.id),
        fileName: varchar('file_name', { length: 200 }),
        // sha256 of the normalized CSV text: the same file uploaded twice is the same import.
        contentHash: varchar('content_hash', { length: 64 }).notNull(),
        status: rfqImportStatus('status').notNull().default('previewed'),
        rowCount: integer('row_count').notNull().default(0),
        errorCount: integer('error_count').notNull().default(0),
        // rows = [{ rowNo, lane|null, errors:[{field,message}] }]
        rows: jsonb('rows').notNull().default([]),
        rfqId: uuid('rfq_id').references(() => rfqs.id),
        confirmedAt: timestamp('confirmed_at'),
        ...timestamps,
    },
    (table) => [uniqueIndex('rfq_imports_hash_unique').on(table.customerCompanyId, table.contentHash)],
);
