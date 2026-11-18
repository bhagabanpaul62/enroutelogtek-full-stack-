/** Drivers: company-scoped CRUD. Drivers have no login (PRD Q-18). */
import { and, desc, eq, ilike, inArray, isNull, or, sql, getTableColumns } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { linkDocument } from '#features/document/document.link.js';
import { drivers } from '../schemas/fleet.Schema.js';
import { docStatus, isAssignable, normalisePhone, todayIST } from '../fleet.rules.js';
import {
    DEFAULT_LIMIT,
    busyDriverSql,
    cursorCondition,
    cursorTextColumn,
    documentsOf,
    effectiveAvailability,
    isUniqueViolation,
    pageOf,
} from './fleet.common.js';

const FIELDS = ['name', 'licenceNumber', 'licenceExpiry', 'yearsExperience', 'hazmatEndorsement'];
const pick = (input) => Object.fromEntries(FIELDS.filter((f) => input[f] !== undefined).map((f) => [f, input[f]]));
const DUPLICATE_PHONE = 'A driver with this phone number already exists in your company';

const shape = ({ busy, cursorCreatedAt, ...row }, today) => {
    const availability = effectiveAvailability({ ...row, busy });
    return {
        ...row,
        availability,
        licenceStatus: docStatus(row.licenceExpiry, today),
        assignable: isAssignable({ ...row, availability }, today),
    };
};

const baseSelect = () => ({
    ...getTableColumns(drivers),
    busy: busyDriverSql(drivers),
    cursorCreatedAt: cursorTextColumn(drivers),
});

const mine = (companyId) => and(eq(drivers.ownerCompanyId, companyId), isNull(drivers.deletedAt));

const loadOwned = async (companyId, id) => {
    const [row] = await db.select(baseSelect()).from(drivers).where(and(mine(companyId), eq(drivers.id, id)));
    if (!row) throw new AppError('Driver not found', 404);
    return row;
};

export const listDrivers = async (user, { q, availability, expiry, cursor, limit = DEFAULT_LIMIT }) => {
    const today = todayIST();
    const conditions = [mine(user.companyId)];
    if (q) {
        const digits = q.replace(/\D/g, '');
        const like = `%${q}%`;
        conditions.push(or(ilike(drivers.name, like), ilike(drivers.licenceNumber, like), digits ? ilike(drivers.phone, `%${digits}%`) : undefined));
    }
    if (availability === 'on_trip') conditions.push(busyDriverSql(drivers));
    else if (availability === 'available') {
        conditions.push(sql`not ${busyDriverSql(drivers)}`, inArray(drivers.availability, ['available', 'on_trip']));
    } else if (availability) conditions.push(eq(drivers.availability, availability), sql`not ${busyDriverSql(drivers)}`);
    if (expiry === 'expired') conditions.push(sql`${drivers.licenceExpiry} < ${today}::date`);
    if (expiry === 'expiring') conditions.push(sql`${drivers.licenceExpiry} <= (${today}::date + 30)`);
    const after = cursorCondition(drivers, cursor);
    if (after) conditions.push(after);

    const rows = await db
        .select(baseSelect())
        .from(drivers)
        .where(and(...conditions))
        .orderBy(desc(drivers.createdAt), desc(drivers.id))
        .limit(limit + 1);
    const { rows: page, pagination } = pageOf(rows, limit);
    return { items: page.map((r) => shape(r, today)), pagination };
};

export const getDriver = async (user, id) => {
    const row = await loadOwned(user.companyId, id);
    return { ...shape(row, todayIST()), documents: await documentsOf('driver', id) };
};

const phoneOrThrow = (raw) => {
    const phone = normalisePhone(raw);
    if (!phone) throw new AppError('Enter a valid 10 digit mobile number', 422);
    return phone;
};

export const createDriver = async (user, input) => {
    const phone = phoneOrThrow(input.phone);
    try {
        const [row] = await db
            .insert(drivers)
            .values({ ownerCompanyId: user.companyId, phone, ...pick(input) })
            .returning({ id: drivers.id });
        return getDriver(user, row.id);
    } catch (error) {
        if (isUniqueViolation(error)) throw new AppError(DUPLICATE_PHONE, 409);
        throw error;
    }
};

export const updateDriver = async (user, id, input) => {
    const current = await loadOwned(user.companyId, id);
    const set = pick(input);
    if (input.phone !== undefined) set.phone = phoneOrThrow(input.phone);
    if (input.availability !== undefined) {
        if (current.busy) throw new AppError('This driver is on a trip. Change availability after the trip.', 409);
        set.availability = input.availability;
        set.isActive = input.availability !== 'inactive';
    }
    if (Object.keys(set).length > 0) {
        try {
            await db.update(drivers).set(set).where(and(mine(user.companyId), eq(drivers.id, id)));
        } catch (error) {
            if (isUniqueViolation(error)) throw new AppError(DUPLICATE_PHONE, 409);
            throw error;
        }
    }
    return getDriver(user, id);
};

export const deleteDriver = async (user, id) => {
    const current = await loadOwned(user.companyId, id);
    if (current.busy) throw new AppError('This driver is on an active trip and cannot be removed', 409);
    await db.update(drivers).set({ deletedAt: new Date(), isActive: false }).where(eq(drivers.id, id));
    return { id };
};

export const addDriverDocument = async (user, id, { fileUrl, number, expiry }) => {
    await loadOwned(user.companyId, id);
    const set = {};
    if (expiry) set.licenceExpiry = expiry;
    if (number) set.licenceNumber = number;
    return db.transaction(async (tx) => {
        const doc = await linkDocument(tx, { user, documentType: 'licence', fileUrl, entityType: 'driver', entityId: id });
        if (Object.keys(set).length > 0) await tx.update(drivers).set(set).where(eq(drivers.id, id));
        return doc;
    });
};

export const assignableDrivers = async (user) => {
    const today = todayIST();
    const rows = await db
        .select(baseSelect())
        .from(drivers)
        .where(and(mine(user.companyId), eq(drivers.isActive, true), sql`not ${busyDriverSql(drivers)}`))
        .orderBy(drivers.name)
        .limit(200);
    return rows.map((r) => shape(r, today)).filter((d) => d.assignable.ok);
};

export const driversExpiring = (companyId, today, days) =>
    db
        .select()
        .from(drivers)
        .where(
            and(
                companyId ? eq(drivers.ownerCompanyId, companyId) : undefined,
                isNull(drivers.deletedAt),
                eq(drivers.isActive, true),
                sql`${drivers.licenceExpiry} <= (${today}::date + ${days}::int)`,
            ),
        );
