/**
 * REPORT RULES: pure functions, no database. Every aggregation the reports and the overview
 * show is computed here so it can be tested against fixtures. Money in paise (integers).
 *
 * Earnings rule (PRD section 4, ENR-035): a trip is earned only when it is `completed`;
 * cancelled and unfinished trips earn 0. Earned, never paid.
 *  - Transporter running the trip itself: approved freight line (the agreed rate).
 *  - Transporter that handed it on: same gross, minus what it owes the next company (cost).
 *  - A company that received the trip through an accepted allocation: that allocation's rate
 *    per truck, minus its own cost if it passed the trip on (broker).
 *  - Extras: approved non-freight charges that the company itself proposed.
 */
import { IST_OFFSET_MS } from './report.constants.js';

const DAY_MS = 86400000;

/** "2026-11-18" in India for an instant. */
export const istDate = (value) => (value ? new Date(new Date(value).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10) : null);

/**
 * Inclusive IST dates -> [start, end) instants. Either side may be missing.
 * @returns {{ start: Date|null, end: Date|null }}
 */
export const istRange = (from, to) => ({
    start: from ? new Date(`${from}T00:00:00+05:30`) : null,
    end: to ? new Date(new Date(`${to}T00:00:00+05:30`).getTime() + DAY_MS) : null,
});

/** Start of this IST month, last IST month and next IST month, as instants. */
export const monthBounds = (now = new Date()) => {
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    const y = ist.getUTCFullYear();
    const m = ist.getUTCMonth();
    const at = (year, month) => new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS);
    return { lastStart: at(y, m - 1), thisStart: at(y, m), nextStart: at(y, m + 1) };
};

export const inRange = (value, start, end) => {
    if (!value) return false;
    const t = new Date(value).getTime();
    return (!start || t >= start.getTime()) && (!end || t < end.getTime());
};

/** Whole percent with one decimal, or null when there is nothing to divide by. */
export const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

/** On time = delivered on or before the load's expected delivery date (IST). null = no promise to judge. */
export const isOnTime = (deliveredAt, expectedDeliveryDate) => {
    if (!deliveredAt || !expectedDeliveryDate) return null;
    return istDate(deliveredAt) <= String(expectedDeliveryDate).slice(0, 10);
};

/** Share of judged trips delivered on time. Trips without a delivery or a promise are left out. */
export const onTimeSummary = (flags) => {
    const judged = flags.filter((f) => f !== null && f !== undefined);
    const onTime = judged.filter(Boolean).length;
    return { judged: judged.length, onTime, onTimePercent: percent(onTime, judged.length) };
};

const sum = (list) => list.reduce((total, n) => total + n, 0);

/**
 * What one company earned on one trip.
 * @param {{ status: string, transporterCompanyId: string }} trip
 * @param {Array<{kind: string, amountPaise: number, status: string, proposedByCompanyId: string|null}>} charges
 * @param {Array<{fromCompanyId: string, toCompanyId: string, ratePerTruckPaise: number}>} legs accepted allocations holding this trip
 * @param {string} viewerId
 * @returns {{ earned: boolean, basePaise: number, extrasPaise: number, costPaise: number, netPaise: number }}
 */
export const tripEarning = (trip, charges, legs, viewerId) => {
    const zero = { earned: false, basePaise: 0, extrasPaise: 0, costPaise: 0, netPaise: 0 };
    if (trip.status !== 'completed') return zero;
    const approved = charges.filter((c) => c.status === 'approved');
    const inbound = legs.find((l) => l.toCompanyId === viewerId);
    const outbound = legs.find((l) => l.fromCompanyId === viewerId);

    let basePaise = 0;
    if (trip.transporterCompanyId === viewerId) basePaise = sum(approved.filter((c) => c.kind === 'freight').map((c) => c.amountPaise));
    else if (inbound) basePaise = inbound.ratePerTruckPaise;
    else return zero; // neither the transporter nor an allocation recipient: nothing earned here

    const extrasPaise = sum(approved.filter((c) => c.kind !== 'freight' && c.proposedByCompanyId === viewerId).map((c) => c.amountPaise));
    const costPaise = outbound ? outbound.ratePerTruckPaise : 0;
    return { earned: true, basePaise, extrasPaise, costPaise, netPaise: basePaise + extrasPaise - costPaise };
};

/** Sum numeric fields of rows grouped by a key. Returns [{key, count, ...sums}] sorted by key. */
export const groupTotals = (rows, keyOf, fields) => {
    const map = new Map();
    for (const row of rows) {
        const key = keyOf(row) ?? 'Unknown';
        const entry = map.get(key) ?? { key, count: 0, ...Object.fromEntries(fields.map((f) => [f, 0])) };
        entry.count += 1;
        for (const f of fields) entry[f] += row[f] ?? 0;
        map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)));
};

/** Earnings dataset totals: money columns plus per-vehicle groups. Only earned rows add up. */
export const earningsTotals = (rows) => {
    const earned = rows.filter((r) => r.earned);
    const fields = ['basePaise', 'extrasPaise', 'costPaise', 'netPaise'];
    return {
        trips: rows.length,
        earnedTrips: earned.length,
        ...Object.fromEntries(fields.map((f) => [f, sum(earned.map((r) => r[f]))])),
        byVehicle: groupTotals(earned, (r) => r.vehicle || null, fields),
    };
};

/**
 * Where a transporter's bid stands. loadStatus + the awards the load has to this transporter.
 * open = bidding still on; pending = awarded, waiting for the answer; won = accepted; lost = anything else.
 */
export const bidOutcome = (loadStatus, awardStatuses) => {
    if (awardStatuses.includes('accepted')) return 'won';
    if (awardStatuses.includes('pending')) return 'pending';
    if (loadStatus === 'live') return 'open';
    if (loadStatus === 'cancelled' || loadStatus === 'expired') return 'closed'; // nobody won; not a loss
    return 'lost';
};

export const bidTotals = (rows) => {
    const count = (o) => rows.filter((r) => r.outcome === o).length;
    const won = count('won');
    const lost = count('lost');
    return { bids: rows.length, won, lost, pending: count('pending'), open: count('open'), winRatePercent: percent(won, won + lost) };
};

/** This month against last month. changePercent is null when last month was 0. */
export const monthCompare = (items, field, bounds) => {
    const at = (list, a, b) => list.filter((i) => inRange(i[field], a, b)).length;
    const thisMonth = at(items, bounds.thisStart, bounds.nextStart);
    const lastMonth = at(items, bounds.lastStart, bounds.thisStart);
    return { thisMonth, lastMonth, changePercent: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10 : null };
};

/** Same for a money field: sum of `amount` by the date in `field`. */
export const monthCompareSum = (items, field, amount, bounds) => {
    const at = (a, b) => sum(items.filter((i) => inRange(i[field], a, b)).map((i) => i[amount]));
    const thisMonth = at(bounds.thisStart, bounds.nextStart);
    const lastMonth = at(bounds.lastStart, bounds.thisStart);
    return { thisMonth, lastMonth, changePercent: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10 : null };
};

/** Cell text safe for spreadsheets: a leading = + - @ would run as a formula in Excel. */
const safeCell = (value) => {
    if (value === null || value === undefined) return '';
    const text = value instanceof Date ? value.toISOString() : String(value);
    return /^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
};

/** RFC 4180 CSV with a header row. columns = [{key, label}]. */
export const toCsv = (columns, rows) => {
    const quote = (text) => (/[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text);
    const lines = [columns.map((c) => quote(c.label)).join(',')];
    for (const row of rows) lines.push(columns.map((c) => quote(safeCell(row[c.key]))).join(','));
    return `﻿${lines.join('\r\n')}\r\n`;
};

/** Rupees with two decimals from paise, for exports ("12345.50"). */
export const rupees = (paise) => (paise === null || paise === undefined ? '' : (paise / 100).toFixed(2));

/** Two numbers side by side for the overview. changePercent is null when last month was 0. */
export const compareValues = (thisMonth, lastMonth) => ({
    thisMonth,
    lastMonth,
    changePercent: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10 : null,
});
