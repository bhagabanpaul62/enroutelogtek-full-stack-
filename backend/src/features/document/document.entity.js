/** Does the entity a document is being attached to belong to the actor's company? Not found otherwise. */
import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { loads } from '#features/load/schemas/index.js';
import { discrepancies, trips } from '#features/trip/schemas/trip.Schema.js';
import { drivers, vehicles } from '#features/fleet/schemas/fleet.Schema.js';

const notFound = () => new AppError('The item this file belongs to was not found', 404);

export async function assertEntityOwned(companyId, entityType, entityId) {
    let row;
    if (entityType === 'trip') {
        [row] = await db.select({ id: trips.id }).from(trips)
            .where(and(eq(trips.id, entityId), or(eq(trips.executorCompanyId, companyId), eq(trips.transporterCompanyId, companyId)))).limit(1);
    } else if (entityType === 'discrepancy') {
        [row] = await db.select({ id: discrepancies.id }).from(discrepancies)
            .innerJoin(trips, eq(discrepancies.tripId, trips.id))
            .innerJoin(loads, eq(trips.loadId, loads.id))
            .where(and(eq(discrepancies.id, entityId), or(eq(trips.executorCompanyId, companyId), eq(trips.transporterCompanyId, companyId), eq(loads.customerCompanyId, companyId)))).limit(1);
    } else if (entityType === 'vehicle') {
        [row] = await db.select({ id: vehicles.id }).from(vehicles)
            .where(and(eq(vehicles.id, entityId), eq(vehicles.ownerCompanyId, companyId), isNull(vehicles.deletedAt))).limit(1);
    } else if (entityType === 'driver') {
        [row] = await db.select({ id: drivers.id }).from(drivers)
            .where(and(eq(drivers.id, entityId), eq(drivers.ownerCompanyId, companyId), isNull(drivers.deletedAt))).limit(1);
    }
    if (!row) throw notFound();
}
