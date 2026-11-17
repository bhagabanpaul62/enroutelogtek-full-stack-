import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { documents } from '#features/document/schemas/documents.Schema.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';

export const DEFAULT_LIMIT = 20;
export const FLEET_COMPANY_TYPES = ['transporter', 'fleet_owner'];

/** A vehicle / driver is busy while any trip that is not completed or cancelled points at it. */
export const busyVehicleSql = (vehicles) =>
    sql`exists (select 1 from trips t where t.vehicle_id = ${vehicles.id} and t.status not in ('completed','cancelled'))`;
export const busyDriverSql = (drivers) =>
    sql`exists (select 1 from trips t where t.driver_id = ${drivers.id} and t.status not in ('completed','cancelled'))`;

/** Stored availability, corrected by what the trips table says right now. */
export const effectiveAvailability = (row) => {
    if (row.busy) return 'on_trip';
    return row.availability === 'on_trip' ? 'available' : row.availability;
};

/** Adds the cursor condition for a (created_at, id) descending page. */
export const cursorCondition = (table, cursor) => {
    if (!cursor) return null;
    const { createdAt, id } = decodeCursor(cursor);
    return sql`(${table.createdAt}, ${table.id}) < (${createdAt}::timestamp, ${id}::uuid)`;
};

export const cursorTextColumn = (table) => sql`${table.createdAt}::text`.mapWith(String);

/** Cuts the extra row off a limit+1 query and builds the pagination block. */
export const pageOf = (rows, limit) => {
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
        rows: page,
        pagination: {
            limit,
            hasMore,
            nextCursor: hasMore ? encodeCursor({ createdAt: last.cursorCreatedAt, id: last.id }) : null,
        },
    };
};

/** True when the error is a Postgres unique violation (drizzle wraps the driver error in `cause`). */
export const isUniqueViolation = (error) => (error?.cause?.code ?? error?.code) === '23505';

export const requireFleetCompany = (user) => {
    if (!user.companyId || !FLEET_COMPANY_TYPES.includes(user.companyType)) {
        throw new AppError('Fleet is for transporter and fleet owner companies', 403);
    }
};

export const documentsOf = (entityType, entityId) =>
    db
        .select({ id: documents.id, documentType: documents.documentType, fileUrl: documents.fileUrl, createdAt: documents.createdAt })
        .from(documents)
        .where(and(eq(documents.entityType, entityType), eq(documents.entityId, entityId), isNull(documents.deletedAt)))
        .orderBy(documents.createdAt);
