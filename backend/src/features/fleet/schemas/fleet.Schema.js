import { sql } from 'drizzle-orm';
import { boolean, date, index, integer, numeric, pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { vehicleTypes } from '#features/load/schemas/master.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';

/**
 * A truck a transporter or fleet owner owns. The registration number is normalised (upper case,
 * letters and digits only, see fleet.rules.js) and unique on the whole platform. Files (RC,
 * insurance, permit, fitness, PUC) live in `documents` with entity_type = 'vehicle'.
 */
export const vehicles = pgTable(
    'vehicles',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        ownerCompanyId: uuid('owner_company_id').notNull().references(() => companies.id),
        registrationNumber: varchar('registration_number', { length: 20 }).notNull(),
        vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id),
        capacityTons: numeric('capacity_tons', { precision: 6, scale: 2, mode: 'number' }),
        // available | on_trip | maintenance | inactive. on_trip is set by the trip service, not by hand.
        availability: varchar('availability', { length: 20 }).notNull().default('available'),
        rcNumber: varchar('rc_number', { length: 40 }),
        rcExpiry: date('rc_expiry', { mode: 'string' }),
        insuranceNumber: varchar('insurance_number', { length: 40 }),
        insuranceExpiry: date('insurance_expiry', { mode: 'string' }),
        permitNumber: varchar('permit_number', { length: 40 }),
        permitExpiry: date('permit_expiry', { mode: 'string' }),
        fitnessNumber: varchar('fitness_number', { length: 40 }),
        fitnessExpiry: date('fitness_expiry', { mode: 'string' }),
        pucExpiry: date('puc_expiry', { mode: 'string' }),
        isActive: boolean('is_active').notNull().default(true),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('vehicles_registration_idx').on(table.registrationNumber).where(sql`${table.deletedAt} is null`),
        index('vehicles_owner_idx').on(table.ownerCompanyId, table.availability),
    ],
);

/** A driver the company manages (no login in v1, PRD Q-18). Phone is unique inside one company. */
export const drivers = pgTable(
    'drivers',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        ownerCompanyId: uuid('owner_company_id').notNull().references(() => companies.id),
        name: varchar('name', { length: 100 }).notNull(),
        phone: varchar('phone', { length: 15 }).notNull(),
        licenceNumber: varchar('licence_number', { length: 30 }),
        licenceExpiry: date('licence_expiry', { mode: 'string' }),
        availability: varchar('availability', { length: 20 }).notNull().default('available'), // available | on_trip | off_duty | inactive
        isActive: boolean('is_active').notNull().default(true),
        yearsExperience: integer('years_experience'),
        // AJ-16: required to be assigned a hazmat load.
        hazmatEndorsement: boolean('hazmat_endorsement').notNull().default(false),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('drivers_company_phone_idx').on(table.ownerCompanyId, table.phone).where(sql`${table.deletedAt} is null`),
        index('drivers_owner_idx').on(table.ownerCompanyId, table.availability),
    ],
);
