import { boolean, integer, numeric, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { timestamps } from '#shared/schemas/column.Helper.js';

/** Indian truck types the customer picks from (seeded by migration 0005, editable by the platform admin later). */
export const vehicleTypes = pgTable('vehicle_types', {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 30 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    // open | closed | trailer | tanker | reefer | tipper | odc
    bodyType: varchar('body_type', { length: 30 }).notNull(),
    // Typical payload, used to prefill capacity per vehicle. Editable on the load.
    capacityTons: numeric('capacity_tons', { precision: 6, scale: 2, mode: 'number' }),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
});

/** Materials the customer picks from. "Other" is a free-text field on the load. */
export const commodities = pgTable('commodities', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
});

/** PIN code → city and state, to prefill the route fields. Seeded with the main hubs; the user can always type. */
export const pinCodes = pgTable('pin_codes', {
    pinCode: varchar('pin_code', { length: 6 }).primaryKey(),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
});
