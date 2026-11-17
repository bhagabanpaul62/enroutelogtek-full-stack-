/** Shared reads for reports and metrics: trips in a company's scope, with charges and allocation legs. */
import { and, eq, gte, inArray, lt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#shared/db/index.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { loads } from '#features/load/schemas/index.js';
import { loadNumber } from '#features/load/load.rules.js';
import { vehicles } from '#features/fleet/schemas/fleet.Schema.js';
import { allocations, allocationTrips } from '#features/allocation/schemas/index.js';
import { tripCharges, trips } from '#features/trip/schemas/trip.Schema.js';
import { isOnTime, tripEarning } from '../report.rules.js';

const transporterCo = alias(companies, 'transporter_co');
const customerCo = alias(companies, 'customer_co');

/** Which trips a company may read: its own loads, its award, what it runs, or what an accepted allocation gave it. */
export const tripScope = (company) => {
    if (company.companyType === 'customer') return eq(loads.customerCompanyId, company.id);
    if (company.companyType === 'transporter') return eq(trips.transporterCompanyId, company.id);
    return or(
        eq(trips.executorCompanyId, company.id),
        sql`exists (select 1 from allocation_trips at join allocations a on a.id = at.allocation_id
            where at.trip_id = ${trips.id} and at.active and a.status = 'accepted' and a.to_company_id = ${company.id})`,
    );
};

/**
 * Trips in scope with everything a report row needs. limit = max rows (the caller passes cap + 1
 * to detect overflow); null = no limit.
 * @param {{start?: Date|null, end?: Date|null, dateField?: string, status?: string}} filter
 */
export const fetchTrips = async (company, { start, end, dateField = 'createdAt', status } = {}, limit = null) => {
    const column = trips[dateField];
    const where = and(
        tripScope(company),
        status ? eq(trips.status, status) : undefined,
        start ? gte(column, start) : undefined,
        end ? lt(column, end) : undefined,
    );
    let query = db
        .select({
            id: trips.id, seqNo: trips.seqNo, status: trips.status, transporterCompanyId: trips.transporterCompanyId,
            executorCompanyId: trips.executorCompanyId, createdAt: trips.createdAt, deliveredAt: trips.deliveredAt, completedAt: trips.completedAt,
            loadId: loads.id, loadKind: loads.kind, loadSeq: loads.loadSeq, loadCreatedAt: loads.createdAt,
            pickupCity: loads.pickupCity, dropCity: loads.dropCity, expectedDeliveryDate: loads.expectedDeliveryDate,
            vehicle: vehicles.registrationNumber, transporter: transporterCo.companyName, customer: customerCo.companyName,
        })
        .from(trips)
        .innerJoin(loads, eq(loads.id, trips.loadId))
        .leftJoin(vehicles, eq(vehicles.id, trips.vehicleId))
        .innerJoin(transporterCo, eq(transporterCo.id, trips.transporterCompanyId))
        .innerJoin(customerCo, eq(customerCo.id, loads.customerCompanyId))
        .where(where)
        .orderBy(sql`${trips.createdAt} desc, ${trips.id} desc`);
    if (limit) query = query.limit(limit);
    const rows = await query;
    return withMoney(rows);
};

/** Adds charges and accepted allocation legs to trip rows (two queries, not one per trip). */
const withMoney = async (rows) => {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [charges, legs] = await Promise.all([
        db.select().from(tripCharges).where(and(inArray(tripCharges.tripId, ids), eq(tripCharges.status, 'approved'))),
        db
            .select({ tripId: allocationTrips.tripId, fromCompanyId: allocations.fromCompanyId, toCompanyId: allocations.toCompanyId, ratePerTruckPaise: allocations.ratePerTruckPaise })
            .from(allocationTrips)
            .innerJoin(allocations, eq(allocations.id, allocationTrips.allocationId))
            .where(and(inArray(allocationTrips.tripId, ids), eq(allocationTrips.active, true), eq(allocations.status, 'accepted'))),
    ]);
    const by = (list) => list.reduce((m, x) => m.set(x.tripId, [...(m.get(x.tripId) ?? []), x]), new Map());
    const chargeMap = by(charges);
    const legMap = by(legs);
    return rows.map((r) => ({
        ...r,
        tripNo: `${loadNumber(r.loadKind, r.loadSeq, r.loadCreatedAt)} / T${r.seqNo}`,
        lane: `${r.pickupCity ?? '-'} to ${r.dropCity ?? '-'}`,
        charges: chargeMap.get(r.id) ?? [],
        legs: legMap.get(r.id) ?? [],
    }));
};

/** The earning of `company` on a fetched trip row. */
export const earningOf = (company, row) => tripEarning(row, row.charges, row.legs, company.id);
export const onTimeOf = (row) => (row.status === 'completed' || row.status === 'delivered' ? isOnTime(row.deliveredAt, row.expectedDeliveryDate) : null);
