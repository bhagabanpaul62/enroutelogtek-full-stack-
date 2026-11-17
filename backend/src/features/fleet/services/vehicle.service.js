/** Vehicles: company-scoped CRUD, documents with expiry, and the picker list for trip assignment. */
import { and, desc, eq, ilike, inArray, isNull, sql, getTableColumns } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { vehicleTypes } from '#features/load/schemas/master.Schema.js';
import { linkDocument } from '#features/document/document.link.js';
import { vehicles } from '../schemas/fleet.Schema.js';
import { isAssignable, normaliseRegistration, todayIST, vehicleDocStatus } from '../fleet.rules.js';
import {
    DEFAULT_LIMIT,
    busyVehicleSql,
    cursorCondition,
    cursorTextColumn,
    documentsOf,
    effectiveAvailability,
    isUniqueViolation,
    pageOf,
} from './fleet.common.js';

const EXPIRY_COLUMNS = ['rc_expiry', 'insurance_expiry', 'permit_expiry', 'fitness_expiry', 'puc_expiry'];
// least() skips nulls, so this is the soonest expiry on file.
const soonestExpiry = sql.raw(`least(${EXPIRY_COLUMNS.map((c) => `vehicles.${c}`).join(', ')})`);

// document type -> [number column, expiry column] on vehicles
const DOC_COLUMNS = {
    rc: ['rcNumber', 'rcExpiry'],
    insurance: ['insuranceNumber', 'insuranceExpiry'],
    permit: ['permitNumber', 'permitExpiry'],
    fitness: ['fitnessNumber', 'fitnessExpiry'],
    puc: [null, 'pucExpiry'],
};
export const VEHICLE_DOCUMENT_TYPES = Object.keys(DOC_COLUMNS);

const FIELDS = [
    'vehicleTypeId', 'capacityTons', 'rcNumber', 'rcExpiry', 'insuranceNumber', 'insuranceExpiry',
    'permitNumber', 'permitExpiry', 'fitnessNumber', 'fitnessExpiry', 'pucExpiry',
];
const pick = (input) => Object.fromEntries(FIELDS.filter((f) => input[f] !== undefined).map((f) => [f, input[f]]));

const shape = ({ busy, cursorCreatedAt, ...row }, today) => ({
    ...row,
    availability: effectiveAvailability({ ...row, busy }),
    docStatus: vehicleDocStatus(row, today),
    assignable: isAssignable({ ...row, availability: effectiveAvailability({ ...row, busy }) }, today),
});

const baseSelect = () => ({
    ...getTableColumns(vehicles),
    busy: busyVehicleSql(vehicles),
    cursorCreatedAt: cursorTextColumn(vehicles),
    vehicleTypeName: sql`(select name from vehicle_types vt where vt.id = ${vehicles.vehicleTypeId})`.mapWith(String),
});

const mine = (companyId) => and(eq(vehicles.ownerCompanyId, companyId), isNull(vehicles.deletedAt));

const loadOwned = async (companyId, id) => {
    const [row] = await db
        .select(baseSelect())
        .from(vehicles)
        .where(and(mine(companyId), eq(vehicles.id, id)));
    if (!row) throw new AppError('Vehicle not found', 404);
    return row;
};

const checkType = async (vehicleTypeId) => {
    if (!vehicleTypeId) return;
    const [row] = await db.select({ id: vehicleTypes.id }).from(vehicleTypes).where(eq(vehicleTypes.id, vehicleTypeId));
    if (!row) throw new AppError('Unknown vehicle type', 422);
};

export const listVehicles = async (user, { q, availability, vehicleTypeId, expiry, cursor, limit = DEFAULT_LIMIT }) => {
    const today = todayIST();
    const conditions = [mine(user.companyId)];
    if (q) {
        const compact = q.replace(/[^a-zA-Z0-9]/g, '');
        if (compact) conditions.push(ilike(vehicles.registrationNumber, `%${compact}%`));
    }
    if (vehicleTypeId) conditions.push(eq(vehicles.vehicleTypeId, vehicleTypeId));
    if (availability === 'on_trip') conditions.push(busyVehicleSql(vehicles));
    else if (availability === 'available') {
        conditions.push(sql`not ${busyVehicleSql(vehicles)}`, inArray(vehicles.availability, ['available', 'on_trip']));
    } else if (availability) conditions.push(eq(vehicles.availability, availability), sql`not ${busyVehicleSql(vehicles)}`);
    if (expiry === 'expired') conditions.push(sql`${soonestExpiry} < ${today}::date`);
    if (expiry === 'expiring') conditions.push(sql`${soonestExpiry} <= (${today}::date + 30)`);
    const after = cursorCondition(vehicles, cursor);
    if (after) conditions.push(after);

    const rows = await db
        .select(baseSelect())
        .from(vehicles)
        .where(and(...conditions))
        .orderBy(desc(vehicles.createdAt), desc(vehicles.id))
        .limit(limit + 1);
    const { rows: page, pagination } = pageOf(rows, limit);
    return { items: page.map((r) => shape(r, today)), pagination };
};

export const getVehicle = async (user, id) => {
    const row = await loadOwned(user.companyId, id);
    return { ...shape(row, todayIST()), documents: await documentsOf('vehicle', id) };
};

export const createVehicle = async (user, input) => {
    const registrationNumber = normaliseRegistration(input.registrationNumber);
    if (!registrationNumber) throw new AppError('Enter a valid registration number, e.g. WB23C4471', 422);
    await checkType(input.vehicleTypeId);
    try {
        const [row] = await db
            .insert(vehicles)
            .values({ ownerCompanyId: user.companyId, registrationNumber, ...pick(input) })
            .returning({ id: vehicles.id });
        return getVehicle(user, row.id);
    } catch (error) {
        if (isUniqueViolation(error)) throw new AppError('A vehicle with this registration number is already on Enroute', 409);
        throw error;
    }
};

export const updateVehicle = async (user, id, input) => {
    const current = await loadOwned(user.companyId, id);
    const set = pick(input);
    if (input.registrationNumber !== undefined) {
        const registrationNumber = normaliseRegistration(input.registrationNumber);
        if (!registrationNumber) throw new AppError('Enter a valid registration number, e.g. WB23C4471', 422);
        set.registrationNumber = registrationNumber;
    }
    if (input.availability !== undefined) {
        if (current.busy) throw new AppError('This vehicle is on a trip. Change its availability after the trip.', 409);
        set.availability = input.availability;
        set.isActive = input.availability !== 'inactive';
    }
    if (set.vehicleTypeId) await checkType(set.vehicleTypeId);
    if (Object.keys(set).length > 0) {
        try {
            await db.update(vehicles).set(set).where(and(mine(user.companyId), eq(vehicles.id, id)));
        } catch (error) {
            if (isUniqueViolation(error)) throw new AppError('A vehicle with this registration number is already on Enroute', 409);
            throw error;
        }
    }
    return getVehicle(user, id);
};

export const deleteVehicle = async (user, id) => {
    const current = await loadOwned(user.companyId, id);
    if (current.busy) throw new AppError('This vehicle is on an active trip and cannot be removed', 409);
    await db.update(vehicles).set({ deletedAt: new Date(), isActive: false }).where(eq(vehicles.id, id));
    return { id };
};

/** Files a document (already uploaded through /documents) on the vehicle and keeps its number and expiry on the row. */
export const addVehicleDocument = async (user, id, { documentType, fileUrl, number, expiry }) => {
    await loadOwned(user.companyId, id);
    const [numberColumn, expiryColumn] = DOC_COLUMNS[documentType];
    const set = {};
    if (expiry) set[expiryColumn] = expiry;
    if (number && numberColumn) set[numberColumn] = number;
    return db.transaction(async (tx) => {
        const doc = await linkDocument(tx, { user, documentType, fileUrl, entityType: 'vehicle', entityId: id });
        if (Object.keys(set).length > 0) await tx.update(vehicles).set(set).where(eq(vehicles.id, id));
        return doc;
    });
};

/** Vehicles the company can put on a trip right now (picker). */
export const assignableVehicles = async (user, { vehicleTypeId } = {}) => {
    const today = todayIST();
    const conditions = [mine(user.companyId), eq(vehicles.isActive, true), sql`not ${busyVehicleSql(vehicles)}`];
    if (vehicleTypeId) conditions.push(eq(vehicles.vehicleTypeId, vehicleTypeId));
    const rows = await db
        .select(baseSelect())
        .from(vehicles)
        .where(and(...conditions))
        .orderBy(vehicles.registrationNumber)
        .limit(200);
    return rows.map((r) => shape(r, today)).filter((v) => v.assignable.ok);
};

/** Vehicles with documents expiring (or expired). Used by the expiring list. */
export const vehiclesExpiring = (companyId, today, days) =>
    db
        .select()
        .from(vehicles)
        .where(
            and(
                companyId ? eq(vehicles.ownerCompanyId, companyId) : undefined,
                isNull(vehicles.deletedAt),
                eq(vehicles.isActive, true),
                sql`${soonestExpiry} <= (${today}::date + ${days}::int)`,
            ),
        );
