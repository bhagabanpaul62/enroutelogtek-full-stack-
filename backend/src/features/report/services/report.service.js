/**
 * REPORTS (ENR-035/036): per company type datasets with date + status filters, JSON / CSV / XLSX.
 * Read-only; every query is scoped to the signed-in company. Dates are Asia/Kolkata days.
 * Row cap: more than REPORT_ROW_LIMIT matching rows is refused (narrow the dates), so totals are always exact.
 */
import { and, count, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { awards, bids, loads } from '#features/load/schemas/index.js';
import { loadNumber } from '#features/load/load.rules.js';
import { requireCompany } from '#features/load/services/load.access.js';
import { allocations } from '#features/allocation/schemas/index.js';
import { rfqs } from '#features/rfq/schemas/index.js';
import { contracts } from '#features/contract/schemas/contract.Schema.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, REPORT_DATASETS, REPORT_ROW_LIMIT } from '../report.constants.js';
import {
    bidOutcome, bidTotals, earningsTotals, groupTotals, istRange, onTimeSummary, rupees, toCsv,
} from '../report.rules.js';
import { earningOf, fetchTrips, onTimeOf } from './report.data.js';

const OVER = `Too many rows (more than ${REPORT_ROW_LIMIT}). Narrow the date range or add a status filter.`;
const guard = (rows) => {
    if (rows.length > REPORT_ROW_LIMIT) throw new AppError(OVER, 422);
    return rows;
};
const sumOf = (rows, key) => rows.reduce((t, r) => t + (r[key] ?? 0), 0);

// ---------- column definitions (also drive CSV / XLSX). money = paise ----------
const COLUMNS = {
    loads: [['loadNo', 'Load'], ['status', 'Status'], ['lane', 'Lane'], ['pickupDate', 'Pickup date'], ['trucks', 'Trucks'], ['createdOn', 'Created'], ['bidsReceived', 'Bids received'], ['transporter', 'Transporter']],
    trips: [['tripNo', 'Trip'], ['status', 'Status'], ['lane', 'Lane'], ['vehicle', 'Vehicle'], ['transporter', 'Transporter'], ['customer', 'Customer'], ['createdOn', 'Created'], ['completedOn', 'Completed'], ['onTime', 'On time']],
    spend: [['tripNo', 'Trip'], ['lane', 'Lane'], ['transporter', 'Transporter'], ['completedOn', 'Completed'], ['spendPaise', 'Spend (INR)', true]],
    bids: [['loadNo', 'Load'], ['lane', 'Lane'], ['outcome', 'Outcome'], ['amountPaise', 'Latest bid (INR)', true], ['attemptsUsed', 'Attempts'], ['rank', 'Rank'], ['createdOn', 'Bid on']],
    earnings: [['tripNo', 'Trip'], ['lane', 'Lane'], ['vehicle', 'Vehicle'], ['status', 'Trip status'], ['completedOn', 'Completed'], ['basePaise', 'Agreed rate (INR)', true], ['extrasPaise', 'Approved extras (INR)', true], ['costPaise', 'Passed on (INR)', true], ['netPaise', 'Earned (INR)', true]],
    offers: [['loadNo', 'Load'], ['lane', 'Lane'], ['from', 'Offered by'], ['status', 'Status'], ['quantity', 'Trucks'], ['ratePaise', 'Rate per truck (INR)', true], ['createdOn', 'Offered'], ['respondedOn', 'Answered']],
};
const columnsOf = (dataset) => COLUMNS[dataset].map(([key, label, money]) => ({ key, label, money: Boolean(money) }));

const ist = (v) => (v ? new Date(new Date(v).getTime() + 330 * 60000).toISOString().slice(0, 10) : '');
const lane = (l) => `${l.pickupCity ?? '-'} to ${l.dropCity ?? '-'}`;

// ---------- datasets: each returns { rows, totals } ----------
const tripFilter = (f, dateField) => ({ ...istRange(f.from, f.to), dateField, status: f.status });

const tripsDataset = async (co, f) => {
    const raw = guard(await fetchTrips(co, tripFilter(f, 'createdAt'), REPORT_ROW_LIMIT + 1));
    const hideCustomer = co.companyType === 'fleet_owner' || co.companyType === 'broker';
    const flags = raw.map(onTimeOf);
    const rows = raw.map((r, i) => ({
        id: r.id, tripNo: r.tripNo, status: r.status, lane: r.lane, vehicle: r.vehicle ?? '', transporter: r.transporter,
        customer: hideCustomer ? '' : r.customer, createdOn: ist(r.createdAt), completedOn: ist(r.completedAt),
        onTime: flags[i] === null ? '' : flags[i] ? 'Yes' : 'No',
    }));
    return { rows, totals: { trips: rows.length, byStatus: groupTotals(rows, (r) => r.status, []), ...onTimeSummary(flags) } };
};

const earningsDataset = async (co, f) => {
    const raw = guard(await fetchTrips(co, tripFilter(f, 'completedAt'), REPORT_ROW_LIMIT + 1));
    const rows = raw.map((r) => ({
        id: r.id, tripNo: r.tripNo, lane: r.lane, vehicle: r.vehicle ?? '', status: r.status, completedOn: ist(r.completedAt), ...earningOf(co, r),
    }));
    return { rows, totals: earningsTotals(rows) };
};

const spendDataset = async (co, f) => {
    const raw = guard(await fetchTrips(co, { ...tripFilter(f, 'completedAt'), status: 'completed' }, REPORT_ROW_LIMIT + 1));
    const rows = raw.map((r) => ({
        id: r.id, tripNo: r.tripNo, lane: r.lane, vehicle: r.vehicle ?? '', transporter: r.transporter, completedOn: ist(r.completedAt),
        spendPaise: r.charges.reduce((t, c) => t + c.amountPaise, 0),
    }));
    return {
        rows,
        totals: {
            trips: rows.length, spendPaise: sumOf(rows, 'spendPaise'),
            byLane: groupTotals(rows, (r) => r.lane, ['spendPaise']), byTransporter: groupTotals(rows, (r) => r.transporter, ['spendPaise']),
        },
    };
};

const loadsDataset = async (co, f) => {
    const { start, end } = istRange(f.from, f.to);
    const raw = guard(
        await db.select().from(loads)
            .where(and(eq(loads.customerCompanyId, co.id), f.status ? eq(loads.status, f.status) : undefined, start ? gte(loads.createdAt, start) : undefined, end ? lt(loads.createdAt, end) : undefined))
            .orderBy(sql`${loads.createdAt} desc, ${loads.id} desc`).limit(REPORT_ROW_LIMIT + 1),
    );
    const ids = raw.map((l) => l.id);
    const [bidCounts, winners] = ids.length === 0 ? [[], []] : await Promise.all([
        db.select({ loadId: bids.loadId, n: count() }).from(bids).where(inArray(bids.loadId, ids)).groupBy(bids.loadId),
        db.select({ loadId: awards.loadId, name: companies.companyName }).from(awards).innerJoin(companies, eq(companies.id, awards.transporterCompanyId))
            .where(and(inArray(awards.loadId, ids), eq(awards.status, 'accepted'))),
    ]);
    const bidMap = new Map(bidCounts.map((b) => [b.loadId, Number(b.n)]));
    const winMap = new Map(winners.map((w) => [w.loadId, w.name]));
    const rows = raw.map((l) => ({
        id: l.id, loadNo: loadNumber(l.kind, l.loadSeq, l.createdAt), status: l.status, lane: lane(l), pickupDate: l.pickupDate ?? '',
        trucks: l.vehicleCount, createdOn: ist(l.createdAt), bidsReceived: bidMap.get(l.id) ?? 0, transporter: winMap.get(l.id) ?? '',
    }));
    return { rows, totals: { loads: rows.length, bidsReceived: sumOf(rows, 'bidsReceived'), byStatus: groupTotals(rows, (r) => r.status, []) } };
};

const bidsDataset = async (co, f) => {
    const { start, end } = istRange(f.from, f.to);
    const raw = guard(
        await db.select({ bid: bids, load: loads }).from(bids).innerJoin(loads, eq(loads.id, bids.loadId))
            .where(and(eq(bids.transporterCompanyId, co.id), start ? gte(bids.createdAt, start) : undefined, end ? lt(bids.createdAt, end) : undefined))
            .orderBy(sql`${bids.createdAt} desc, ${bids.id} desc`).limit(REPORT_ROW_LIMIT + 1),
    );
    const ids = raw.map((r) => r.load.id);
    const mine = ids.length === 0 ? [] : await db.select({ loadId: awards.loadId, status: awards.status }).from(awards).where(and(inArray(awards.loadId, ids), eq(awards.transporterCompanyId, co.id)));
    const statuses = mine.reduce((m, a) => m.set(a.loadId, [...(m.get(a.loadId) ?? []), a.status]), new Map());
    const all = raw.map(({ bid, load }) => ({
        id: bid.id, loadNo: loadNumber(load.kind, load.loadSeq, load.createdAt), lane: lane(load), outcome: bidOutcome(load.status, statuses.get(load.id) ?? []),
        amountPaise: Math.round(Number(bid.currentAmount) * 100), attemptsUsed: bid.attemptsUsed, rank: bid.currentRank ?? '', createdOn: ist(bid.createdAt),
    }));
    const rows = f.status ? all.filter((r) => r.outcome === f.status) : all;
    return { rows, totals: bidTotals(rows) };
};

const offersDataset = async (co, f) => {
    const { start, end } = istRange(f.from, f.to);
    const raw = guard(
        await db.select({ a: allocations, load: loads, from: companies.companyName }).from(allocations)
            .innerJoin(loads, eq(loads.id, allocations.loadId)).innerJoin(companies, eq(companies.id, allocations.fromCompanyId))
            .where(and(eq(allocations.toCompanyId, co.id), f.status ? eq(allocations.status, f.status) : undefined, start ? gte(allocations.createdAt, start) : undefined, end ? lt(allocations.createdAt, end) : undefined))
            .orderBy(sql`${allocations.createdAt} desc, ${allocations.id} desc`).limit(REPORT_ROW_LIMIT + 1),
    );
    const rows = raw.map(({ a, load, from }) => ({
        id: a.id, loadNo: loadNumber(load.kind, load.loadSeq, load.createdAt), lane: lane(load), from, status: a.status, quantity: a.quantity,
        ratePaise: a.ratePerTruckPaise, createdOn: ist(a.createdAt), respondedOn: ist(a.respondedAt),
    }));
    const accepted = rows.filter((r) => r.status === 'accepted');
    return {
        rows,
        totals: { offers: rows.length, accepted: accepted.length, acceptedTrucks: sumOf(accepted, 'quantity'), acceptedValuePaise: accepted.reduce((t, r) => t + r.quantity * r.ratePaise, 0), byStatus: groupTotals(rows, (r) => r.status, []) },
    };
};

const DATASETS = { loads: loadsDataset, trips: tripsDataset, spend: spendDataset, bids: bidsDataset, earnings: earningsDataset, offers: offersDataset };

const company = async (user) => {
    const c = await requireCompany(user);
    return { id: c.id, companyType: c.companyType };
};

const allowed = (co, dataset) => {
    if (!REPORT_DATASETS[co.companyType]?.includes(dataset)) throw new AppError('This report is not available for your company type', 404);
};

/**
 * GET /reports/:dataset. format json -> { rows (one page), totals, columns, page }; csv/xlsx -> file.
 * @returns {Promise<{ json?: object, file?: { name: string, type: string, body: Buffer|string } }>}
 */
export const runReport = async (user, dataset, query) => {
    const co = await company(user);
    allowed(co, dataset);
    const { rows, totals } = await DATASETS[dataset](co, query);
    const columns = columnsOf(dataset);
    const format = query.format ?? 'json';

    if (format === 'json') {
        const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
        const offset = query.offset ?? 0;
        return { json: { dataset, filters: { from: query.from ?? null, to: query.to ?? null, status: query.status ?? null }, timezone: 'Asia/Kolkata', columns, totals, rows: rows.slice(offset, offset + limit), page: { total: rows.length, limit, offset } } };
    }

    const base = `enroute-${dataset}-${query.from ?? 'start'}-${query.to ?? 'today'}`;
    if (format === 'csv') {
        const exported = rows.map((r) => Object.fromEntries(columns.map((c) => [c.key, c.money ? rupees(r[c.key]) : r[c.key]])));
        return { file: { name: `${base}.csv`, type: 'text/csv; charset=utf-8', body: toCsv(columns, exported) } };
    }
    const sheet = XLSX.utils.aoa_to_sheet([
        columns.map((c) => c.label),
        ...rows.map((r) => columns.map((c) => (c.money ? Number(rupees(r[c.key])) : excelText(r[c.key])))),
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, dataset.slice(0, 31));
    return { file: { name: `${base}.xlsx`, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) } };
};

// A cell starting with = + - @ would run as a formula in Excel; XLSX writes strings as strings, but keep parity with CSV.
const excelText = (v) => (typeof v === 'string' && /^[=+\-@]/.test(v) ? `'${v}` : v ?? '');

/** GET /reports/summary: headline numbers for the filters, same figures as the dataset totals. */
export const reportSummary = async (user, query) => {
    const co = await company(user);
    const { start, end } = istRange(query.from, query.to);
    const f = { from: query.from, to: query.to };
    const inCreated = (col) => and(start ? gte(col, start) : undefined, end ? lt(col, end) : undefined);
    const t = (await tripsDataset(co, f)).totals;

    if (co.companyType === 'customer') {
        const [l, s, rfqCount, contractCount] = await Promise.all([
            loadsDataset(co, f), spendDataset(co, f),
            db.select({ n: count() }).from(rfqs).where(and(eq(rfqs.customerCompanyId, co.id), inCreated(rfqs.createdAt))),
            db.select({ n: count() }).from(contracts).where(and(eq(contracts.customerCompanyId, co.id), inCreated(contracts.createdAt))),
        ]);
        return { companyType: co.companyType, filters: f, timezone: 'Asia/Kolkata', loads: l.totals, rfqs: Number(rfqCount[0].n), contracts: Number(contractCount[0].n), trips: t, spend: { spendPaise: s.totals.spendPaise, trips: s.totals.trips } };
    }
    const e = (await earningsDataset(co, f)).totals;
    const earnings = { earnedTrips: e.earnedTrips, basePaise: e.basePaise, extrasPaise: e.extrasPaise, costPaise: e.costPaise, netPaise: e.netPaise, label: 'earned, not paid' };
    if (co.companyType === 'transporter') return { companyType: co.companyType, filters: f, timezone: 'Asia/Kolkata', bids: (await bidsDataset(co, f)).totals, trips: t, earnings };
    return { companyType: co.companyType, filters: f, timezone: 'Asia/Kolkata', offers: (await offersDataset(co, f)).totals, trips: t, earnings };
};
