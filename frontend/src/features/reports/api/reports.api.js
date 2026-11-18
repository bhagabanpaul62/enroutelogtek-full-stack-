import api from '@/shared/api/axios';
import { formatINR } from '@/shared/ui/kit';

const unwrap = (response) => response.data?.data ?? response.data;
const PAGE = 200; // server max page size; the server refuses more than 5000 rows anyway
const MAX_PAGES = 25;

// Backend contract: GET /reports/:dataset -> { rows, totals, page: { total, limit, offset } }. Customers read "spend"; everyone else "earnings".
export const datasetFor = (companyType) => (companyType === 'customer' ? 'spend' : 'earnings');

async function fetchAll(dataset, params) {
    let offset = 0;
    let rows = [];
    let totals = {};
    for (let i = 0; i < MAX_PAGES; i += 1) {
        const body = await api.get(`/reports/${dataset}`, { params: { ...params, limit: PAGE, offset } }).then(unwrap);
        rows = rows.concat(body.rows ?? []);
        totals = body.totals ?? {};
        offset += PAGE;
        if (offset >= (body.page?.total ?? 0)) break;
    }
    return { rows, totals };
}

const dayBefore = (ymd, n) => {
    const [y, m, d] = ymd.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d - n));
    return t.toISOString().slice(0, 10);
};
const span = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
const previousRange = ({ from, to }) => {
    const n = span(from, to);
    return { from: dayBefore(from, n), to: dayBefore(from, 1) };
};

const BUCKET = { active: (s) => s !== 'completed' && s !== 'cancelled', completed: (s) => s === 'completed', cancelled: (s) => s === 'cancelled' };
const money = (r) => r.spendPaise ?? r.netPaise ?? 0;
const sum = (rows) => rows.reduce((t, r) => t + (r.amountPaise ?? money(r)), 0);

/** Reads the dataset for this and the previous period, shapes it for ReportsPage and EarningsPage. params: { from, to, bucket? }. */
export async function getReportApi(params, companyType) {
    const { bucket = 'all', ...range } = params;
    const dataset = datasetFor(companyType);
    // spend rows are completed trips only and carry no status; earnings rows carry the trip status
    const [cur, prev] = await Promise.all([fetchAll(dataset, range), fetchAll(dataset, previousRange(range))]);
    const keep = (r) => bucket === 'all' || BUCKET[bucket](r.status ?? 'completed');
    const rows = cur.rows.filter(keep).map((r) => ({
        id: r.id, tripNo: r.tripNo, date: r.completedOn || null, lane: r.lane, party: r.transporter ?? '', vehicle: r.vehicle ?? '',
        status: r.status ?? 'completed', amountPaise: money(r), agreedPaise: r.basePaise ?? money(r), extrasPaise: r.extrasPaise ?? 0, completedAt: r.completedOn || null,
    }));
    const previousRows = prev.rows.filter(keep);
    const days = span(range.from, range.to);
    const trend = Array.from({ length: days }, (_, i) => {
        const date = dayBefore(range.from, -i);
        const prevDate = dayBefore(previousRange(range).from, -i);
        return {
            date,
            value: rows.filter((r) => r.date === date).reduce((t, r) => t + r.amountPaise, 0),
            previous: previousRows.filter((r) => r.completedOn === prevDate).reduce((t, r) => t + money(r), 0),
        };
    });
    const group = (key) => [...rows.reduce((m, r) => m.set(key(r), (m.get(key(r)) ?? 0) + r.amountPaise), new Map())];
    const byLane = group((r) => r.lane).map(([label, amountPaise]) => ({ label, amountPaise, trips: rows.filter((r) => r.lane === label).length })).sort((a, b) => b.amountPaise - a.amountPaise);
    const perVehicle = group((r) => r.vehicle || 'Not assigned').map(([registration, earnedPaise]) => ({ vehicleId: registration, registration, earnedPaise, trips: rows.filter((r) => (r.vehicle || 'Not assigned') === registration).length }));
    const done = (list) => list.filter((r) => (r.status ?? 'completed') === 'completed').length;
    return {
        kpis: {
            trips: { value: rows.length, previous: previousRows.length },
            completed: { value: done(rows), previous: done(previousRows) },
            amountPaise: { value: sum(rows), previous: sum(previousRows) },
        },
        trend, byLane, perVehicle, rows,
        totals: { earnedPaise: sum(rows), previousEarnedPaise: sum(previousRows), trips: rows.length },
    };
}

export const getEarningsApi = (params) => getReportApi(params, 'fleet_owner');

// Backend /metrics/overview -> { pending, live, monthly }; shown as cards.
// Recent activity = the signed-in user's latest notifications: they fan out to every member of the
// company and each one carries its own absolute link (data.link).
const MONTH_HREF = {};
const ACTIVITY_LIMIT = 8;
const recentActivity = () =>
    api
        .get('/notifications', { params: { limit: ACTIVITY_LIMIT } })
        .then(unwrap)
        .then((items) => (Array.isArray(items) ? items : []).map((n) => ({ id: n.id, text: n.title, detail: n.message, at: n.createdAt, href: n.data?.link })))
        // The feed is secondary: if it fails, the metric cards still load.
        .catch(() => []);

export async function getOverviewMetricsApi() {
    const [m, activity] = await Promise.all([api.get('/metrics/overview').then(unwrap), recentActivity()]);
    const plain = (list) => (list ?? []).map((c) => ({ key: c.key, label: c.label, value: c.count, href: MONTH_HREF[c.key] }));
    const monthly = (m.monthly ?? []).map((c) => ({
        key: c.key,
        label: `${c.label} this month`,
        value: c.money ? formatINR(c.thisMonth, { compact: true }) : c.thisMonth,
        meta: c.changePercent === null || c.changePercent === undefined ? 'No earlier month to compare' : `${c.changePercent > 0 ? '+' : ''}${c.changePercent}% vs last month`,
    }));
    return { cards: [...plain(m.pending), ...plain(m.live), ...monthly], activity };
}

/** Saves the file the server builds for the same filters. companyType picks the dataset. format: csv | xlsx. */
export async function downloadExportApi(companyType, params, format) {
    const dataset = datasetFor(companyType);
    const { from, to } = params;
    const res = await api.get(`/reports/${dataset}`, { params: { from, to, format }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset}-${from}-to-${to}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
