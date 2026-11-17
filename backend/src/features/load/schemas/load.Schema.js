import { sql } from 'drizzle-orm';
import {
    bigint,
    boolean,
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
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';
import { commodities, vehicleTypes } from './master.Schema.js';
import { LOAD_KINDS, LOAD_STATUSES, PRICE_BASES } from '../load.constants.js';

const paise = (name) => bigint(name, { mode: 'number' });
const kg = (name) => numeric(name, { precision: 10, scale: 2, mode: 'number' });

export const loadKind = pgEnum('load_kind', LOAD_KINDS);
export const loadStatus = pgEnum('load_status', LOAD_STATUSES);
export const priceBasis = pgEnum('price_basis', PRICE_BASES);

const money = (name) => numeric(name, { precision: 12, scale: 2, mode: 'number' });
const tons = (name) => numeric(name, { precision: 10, scale: 2, mode: 'number' });

/**
 * One load a customer wants moved. kind = ad_hoc today; contract loads reuse the same row
 * later (the build map's "one RFQ table with a kind column"). Columns follow the five wizard
 * steps: route and schedule, material and truck, price and bid rules, invitees, lifecycle.
 */
export const loads = pgTable(
    'loads',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        // Human number AH-2026-000042 is derived from this and the creation year (load.rules.js).
        loadSeq: serial('load_seq').notNull().unique(),
        kind: loadKind('kind').notNull().default('ad_hoc'),
        status: loadStatus('status').notNull().default('draft'),
        customerCompanyId: uuid('customer_company_id')
            .notNull()
            .references(() => companies.id),
        createdByUserId: uuid('created_by_user_id')
            .notNull()
            .references(() => users.id),
        // Wizard step the draft was last saved on, so the Loads list can resume it.
        lastStep: integer('last_step').notNull().default(1),

        // Step 1: route and schedule
        pickupPinCode: varchar('pickup_pin_code', { length: 6 }),
        pickupCity: varchar('pickup_city', { length: 100 }),
        pickupState: varchar('pickup_state', { length: 100 }),
        pickupAddress: varchar('pickup_address', { length: 300 }),
        pickupContactName: varchar('pickup_contact_name', { length: 100 }),
        pickupContactPhone: varchar('pickup_contact_phone', { length: 15 }),
        dropPinCode: varchar('drop_pin_code', { length: 6 }),
        dropCity: varchar('drop_city', { length: 100 }),
        dropState: varchar('drop_state', { length: 100 }),
        dropAddress: varchar('drop_address', { length: 300 }),
        dropContactName: varchar('drop_contact_name', { length: 100 }),
        dropContactPhone: varchar('drop_contact_phone', { length: 15 }),
        pickupDate: date('pickup_date', { mode: 'string' }),
        pickupTimeFrom: varchar('pickup_time_from', { length: 5 }),
        pickupTimeTo: varchar('pickup_time_to', { length: 5 }),
        flexibilityDays: integer('flexibility_days').notNull().default(0),
        expectedDeliveryDate: date('expected_delivery_date', { mode: 'string' }),

        // Step 2: material and truck
        commodityId: uuid('commodity_id').references(() => commodities.id),
        commodityOther: varchar('commodity_other', { length: 100 }),
        weightTons: tons('weight_tons'),
        packaging: varchar('packaging', { length: 30 }),
        loadType: varchar('load_type', { length: 3 }).notNull().default('FTL'),
        vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id),
        vehicleCount: integer('vehicle_count').notNull().default(1),
        capacityTonsPerVehicle: tons('capacity_tons_per_vehicle'),
        specialRequirements: jsonb('special_requirements').notNull().default([]),
        notes: text('notes'),
        attachmentUrl: varchar('attachment_url', { length: 1000 }),

        // Step 3: price and bid rules
        priceBasis: priceBasis('price_basis').notNull().default('per_vehicle'),
        // Never sent to transporters (client question Q4).
        targetPrice: money('target_price'),
        closesAt: timestamp('closes_at'),
        maxAttempts: integer('max_attempts').notNull().default(5),
        paymentTerms: varchar('payment_terms', { length: 200 }),
        autoExtendOnce: boolean('auto_extend_once').notNull().default(false),

        // Step 4: the invite list while drafting. Publish copies it into load_invitations
        // (the snapshot), after which this column is only history.
        inviteeCompanyIds: jsonb('invitee_company_ids').notNull().default([]),

        // Wave 2 (AJ-05..13). Money in paise. All nullable: FTL loads ignore the PTL block.
        pickupPlaceKind: varchar('pickup_place_kind', { length: 10 }), // door | godown
        dropPlaceKind: varchar('drop_place_kind', { length: 10 }),
        pickupIsOda: boolean('pickup_is_oda').notNull().default(false),
        dropIsOda: boolean('drop_is_oda').notNull().default(false),
        distanceKm: integer('distance_km'),
        hazmatClass: varchar('hazmat_class', { length: 2 }), // set when 'hazmat' tag chosen
        unNumber: varchar('un_number', { length: 8 }),
        declaredValuePaise: paise('declared_value_paise'),
        invoiceNumber: varchar('invoice_number', { length: 50 }),
        invoiceDate: date('invoice_date', { mode: 'string' }),
        // PTL cargo block. packageDims = [{ count, lengthCm, widthCm, heightCm, weightKg? }]
        packageCount: integer('package_count'),
        packageDims: jsonb('package_dims').notNull().default([]),
        actualWeightKg: kg('actual_weight_kg'),
        volumetricWeightKg: kg('volumetric_weight_kg'),
        chargeableWeightKg: kg('chargeable_weight_kg'), // max(actual, volumetric, min 50), set by load.rules
        stackable: boolean('stackable'),
        handling: varchar('handling', { length: 20 }),
        // Commercial terms (AJ-12/13). Snapshotted onto the award at acceptance.
        freeTimeLoadingHours: integer('free_time_loading_hours').notNull().default(24),
        freeTimeUnloadingHours: integer('free_time_unloading_hours').notNull().default(24),
        detentionRatePaisePerHour: paise('detention_rate_paise_per_hour').notNull().default(0),
        labourPayableBy: varchar('labour_payable_by', { length: 12 }).notNull().default('consignor'),
        freightPayableBy: varchar('freight_payable_by', { length: 12 }).notNull().default('consignor'),
        tollIncluded: boolean('toll_included').notNull().default(true),

        // Lifecycle
        publishedAt: timestamp('published_at'),
        closedAt: timestamp('closed_at'),
        awardedAt: timestamp('awarded_at'),
        acceptedAt: timestamp('accepted_at'),
        completedAt: timestamp('completed_at'),
        cancelledAt: timestamp('cancelled_at'),
        cancelReason: varchar('cancel_reason', { length: 300 }),
        extensionCount: integer('extension_count').notNull().default(0),
        closingSoonNotifiedAt: timestamp('closing_soon_notified_at'),
        ...timestamps,
    },
    (table) => [
        // The customer's Loads list: own company, by status, newest first.
        index('loads_customer_idx').on(table.customerCompanyId, table.status, table.createdAt),
        // The clock job: live loads whose window has ended.
        index('loads_status_closes_idx').on(table.status, table.closesAt),
        check('loads_vehicle_count_positive', sql`${table.vehicleCount} >= 1`),
        check('loads_max_attempts_positive', sql`${table.maxAttempts} >= 1`),
    ],
);
