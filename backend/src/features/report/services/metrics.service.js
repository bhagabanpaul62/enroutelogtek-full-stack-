/**
 * METRICS (ENR-037): GET /metrics/overview. Real counts only, one set per company type.
 * Each pending/live count is the same filter as the list it links to; money is the same
 * earnings rule the reports use. A module with no data source (nothing to count) is not shown.
 */
import { and, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { requireCompany } from '#features/load/services/load.access.js';
import { awards, loads } from '#features/load/schemas/index.js';
import { allocations } from '#features/allocation/schemas/index.js';
import { rfqLaneAwards, rfqs } from '#features/rfq/schemas/rfq.Schema.js';
import { contractIndents, contracts } from '#features/contract/schemas/contract.Schema.js';
import { placementMisses, tripCharges, trips } from '#features/trip/schemas/trip.Schema.js';
import { ACTIVE_STATUSES } from '#features/trip/trip.rules.js';
import { OPEN_CONTRACT_STATUSES } from '#features/contract/contract.constants.js';
import { compareValues, monthBounds } from '../report.rules.js';
import { earningOf, fetchTrips, tripScope } from './report.data.js';

const n = async (query) => Number((await query)[0]?.c ?? 0);
const item = (key, label, value) => ({ key, label, count: value });

const monthCount = async (table, column, where, b) => {
    const [row] = await db
        .select({
            thisMonth: sql`count(*) filter (where ${column} >= ${b.thisStart} and ${column} < ${b.nextStart})`.mapWith(Number),
            lastMonth: sql`count(*) filter (where ${column} >= ${b.lastStart} and ${column} < ${b.thisStart})`.mapWith(Number),
        })
        .from(table)
        .where(where);
    return compareValues(row.thisMonth, row.lastMonth);
};

/** Earned (net) this month vs last month by completion date: same rule as the Earnings report. */
const earnedByMonth = async (co, b) => {
    const rows = await fetchTrips(co, { start: b.lastStart, end: b.nextStart, dateField: 'completedAt', status: 'completed' });
    let thisMonth = 0;
    let lastMonth = 0;
    for (const r of rows) {
        const net = earningOf(co, r).netPaise;
        if (r.completedAt >= b.thisStart) thisMonth += net;
        else lastMonth += net;
    }
    return compareValues(thisMonth, lastMonth);
};

/** Trips completed this month vs last (company scope, via the same scope as the reports). */
const tripsDoneByMonth = async (co, b) => {
    const rows = await fetchTrips(co, { start: b.lastStart, end: b.nextStart, dateField: 'completedAt', status: 'completed' });
    const thisMonth = rows.filter((r) => r.completedAt >= b.thisStart).length;
    return compareValues(thisMonth, rows.length - thisMonth);
};

const tripCount = (co, ...conds) =>
    n(db.select({ c: count() }).from(trips).innerJoin(loads, eq(loads.id, trips.loadId)).where(and(tripScope(co), ...conds)));

const customerOverview = async (co, b) => {
    const mine = eq(loads.customerCompanyId, co.id);
    const [toAward, podsToConfirm, chargesToDecide, placement, rfqsToAward, liveLoads, openRfqs, active, contractsActive, posted, done] = await Promise.all([
        n(db.select({ c: count() }).from(loads).where(and(mine, eq(loads.status, 'closed')))),
        tripCount(co, eq(trips.status, 'delivered')),
        n(db.select({ c: count() }).from(tripCharges).innerJoin(trips, eq(trips.id, tripCharges.tripId)).innerJoin(loads, eq(loads.id, trips.loadId))
            .where(and(mine, eq(tripCharges.status, 'proposed'), sql`${trips.status} <> 'cancelled'`))),
        n(db.select({ c: count() }).from(placementMisses).innerJoin(loads, eq(loads.id, placementMisses.loadId)).where(and(mine, isNull(placementMisses.decision)))),
        n(db.select({ c: count() }).from(rfqs).where(and(eq(rfqs.customerCompanyId, co.id), eq(rfqs.status, 'closed')))),
        n(db.select({ c: count() }).from(loads).where(and(mine, eq(loads.status, 'live')))),
        n(db.select({ c: count() }).from(rfqs).where(and(eq(rfqs.customerCompanyId, co.id), eq(rfqs.status, 'open')))),
        tripCount(co, inArray(trips.status, ACTIVE_STATUSES)),
        n(db.select({ c: count() }).from(contracts).where(and(eq(contracts.customerCompanyId, co.id), inArray(contracts.status, OPEN_CONTRACT_STATUSES)))),
        monthCount(loads, loads.publishedAt, mine, b),
        tripsDoneByMonth(co, b),
    ]);
    const spend = await spendByMonth(co, b);
    return {
        pending: [item('loads_to_award', 'Loads waiting for an award', toAward), item('pods_to_confirm', 'Deliveries to confirm', podsToConfirm),
            item('charges_to_decide', 'Charges to approve', chargesToDecide), item('placement_decisions', 'Missed placements to decide', placement), item('rfqs_to_award', 'RFQs ready to award', rfqsToAward)],
        live: [item('live_loads', 'Loads open for bids', liveLoads), item('open_rfqs', 'RFQs open for quotes', openRfqs), item('trips_in_progress', 'Trips on the road', active), item('active_contracts', 'Active contracts', contractsActive)],
        monthly: [{ key: 'loads_published', label: 'Loads published', ...posted }, { key: 'trips_completed', label: 'Trips completed', ...done }, { key: 'spend_paise', label: 'Spend on completed trips', money: true, ...spend }],
    };
};

const spendByMonth = async (co, b) => {
    const rows = await fetchTrips(co, { start: b.lastStart, end: b.nextStart, dateField: 'completedAt', status: 'completed' });
    const total = (r) => r.charges.reduce((t, c) => t + c.amountPaise, 0);
    const thisMonth = rows.filter((r) => r.completedAt >= b.thisStart).reduce((t, r) => t + total(r), 0);
    const lastMonth = rows.filter((r) => r.completedAt < b.thisStart).reduce((t, r) => t + total(r), 0);
    return compareValues(thisMonth, lastMonth);
};

const transporterOverview = async (co, b) => {
    const [awardsPending, laneAwards, indents, toAssign, liveTrips, offersOut, contractsActive, done, earned] = await Promise.all([
        n(db.select({ c: count() }).from(awards).where(and(eq(awards.transporterCompanyId, co.id), eq(awards.status, 'pending')))),
        n(db.select({ c: count() }).from(rfqLaneAwards).where(and(eq(rfqLaneAwards.transporterCompanyId, co.id), eq(rfqLaneAwards.status, 'pending')))),
        n(db.select({ c: count() }).from(contractIndents).where(and(eq(contractIndents.transporterCompanyId, co.id), eq(contractIndents.status, 'requested')))),
        tripCount(co, eq(trips.executorCompanyId, co.id), eq(trips.status, 'planned'), isNull(trips.vehicleId)),
        tripCount(co, inArray(trips.status, ACTIVE_STATUSES)),
        n(db.select({ c: count() }).from(allocations).where(and(eq(allocations.fromCompanyId, co.id), eq(allocations.status, 'offered')))),
        n(db.select({ c: count() }).from(contracts).where(and(eq(contracts.transporterCompanyId, co.id), inArray(contracts.status, OPEN_CONTRACT_STATUSES)))),
        tripsDoneByMonth(co, b),
        earnedByMonth(co, b),
    ]);
    return {
        pending: [item('awards_to_accept', 'Awards to accept', awardsPending), item('lane_awards_to_accept', 'RFQ lane awards to accept', laneAwards), item('indents_to_answer', 'Indents to acknowledge', indents), item('trips_to_assign', 'Trips without a truck', toAssign)],
        live: [item('trips_in_progress', 'Trips on the road', liveTrips), item('offers_out', 'Allocation offers waiting for an answer', offersOut), item('active_contracts', 'Active contracts', contractsActive)],
        monthly: [{ key: 'trips_completed', label: 'Trips completed', ...done }, { key: 'earned_paise', label: 'Earned (not paid)', money: true, ...earned }],
    };
};

const partnerOverview = async (co, b) => {
    const broker = co.companyType === 'broker';
    const [offers, liveTrips, offersOut, done, earned] = await Promise.all([
        n(db.select({ c: count() }).from(allocations).where(and(eq(allocations.toCompanyId, co.id), eq(allocations.status, 'offered')))),
        tripCount(co, inArray(trips.status, ACTIVE_STATUSES)),
        broker ? n(db.select({ c: count() }).from(allocations).where(and(eq(allocations.fromCompanyId, co.id), eq(allocations.status, 'offered')))) : 0,
        tripsDoneByMonth(co, b),
        earnedByMonth(co, b),
    ]);
    // Fleet owner: its own planned trips need a truck. Broker: accepted trips it has not placed yet.
    const unplaced = broker
        ? await tripCount(co, eq(trips.executorCompanyId, co.id), eq(trips.status, 'planned'),
            sql`not exists (select 1 from allocation_trips at2 where at2.trip_id = ${trips.id} and at2.depth = 2 and at2.active)`)
        : await tripCount(co, eq(trips.executorCompanyId, co.id), eq(trips.status, 'planned'), isNull(trips.vehicleId));
    return {
        pending: [item('offers_to_answer', 'Offers to answer', offers), broker ? item('trips_to_place', 'Accepted trucks not placed yet', unplaced) : item('trips_to_assign', 'Trips without a truck', unplaced)],
        live: [item('trips_in_progress', 'Trips on the road', liveTrips), ...(broker ? [item('offers_out', 'Offers you placed, waiting', offersOut)] : [])],
        monthly: [{ key: 'trips_completed', label: 'Trips completed', ...done }, { key: 'earned_paise', label: 'Earned (not paid)', money: true, ...earned }],
    };
};

/** GET /metrics/overview */
export const overview = async (user, now = new Date()) => {
    const co = await requireCompany(user);
    const company = { id: co.id, companyType: co.companyType };
    const b = monthBounds(now);
    const body = company.companyType === 'customer' ? await customerOverview(company, b)
        : company.companyType === 'transporter' ? await transporterOverview(company, b)
        : await partnerOverview(company, b);
    return { companyType: company.companyType, timezone: 'Asia/Kolkata', asOf: now.toISOString(), months: { thisStart: b.thisStart, lastStart: b.lastStart }, ...body };
};
