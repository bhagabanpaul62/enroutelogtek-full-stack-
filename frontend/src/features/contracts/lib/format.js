import { formatDate as sharedDate, formatINR } from '@/shared/lib/format';
import { RATE_UNIT } from '../constants';

export const formatDate = (value) => sharedDate(value) || '—';
const IST_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });

/** Today's calendar date in India, "YYYY-MM-DD". */
export const todayIST = () => IST_DAY.format(new Date());

/** "2026-11-17" + 7 → "2026-11-24" (calendar arithmetic, no time zone drift). */
export function addDays(isoDate, days) {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export const monthOf = (isoDate) => String(isoDate || '').slice(0, 7);
export const currentMonth = () => monthOf(todayIST());

/** "Delhi → Mumbai" from either the flat lane fields or a route string. */
export const laneRoute = (lane) =>
    lane?.route || [lane?.originCity, lane?.destCity].filter(Boolean).join(' → ') || '—';

export const laneLabel = (lane) => `Lane ${lane.laneNo}: ${laneRoute(lane)}`;

/** Paise + basis → "₹58,000 / truck". */
export const formatRate = (paise, basis) =>
    paise === null || paise === undefined ? '—' : `${formatINR(paise)} / ${RATE_UNIT[basis] ?? 'truck'}`;

export const rupeesToPaise = (value) => (value === '' || value === null || value === undefined ? null : Math.round(Number(value) * 100));
export const paiseToRupees = (paise) => (paise === null || paise === undefined ? '' : String(paise / 100));

/** "3 trucks"; a PTL contract counts shipments instead (one per indent). */
export const formatTrucks = (n, loadType) => (loadType === 'PTL' ? `${n} ${n === 1 ? 'shipment' : 'shipments'}` : `${n} ${n === 1 ? 'truck' : 'trucks'}`);

/** What an indent asks for: "3 trucks", or "120 kg (8 packages)" on a PTL contract. */
export const indentSize = (indent) =>
    indent?.loadType === 'PTL'
        ? `${indent.chargeableWeightKg} kg chargeable${indent.packageDims?.length ? ` (${indent.packageDims.reduce((n, p) => n + Number(p.count || 0), 0)} packages)` : ''}`
        : formatTrucks(indent?.trucks ?? 0);

/** Readable server error: the message plus any rule list the API returns. */
export function errorText(error, fallback = 'Something went wrong. Please try again.') {
    const data = error?.response?.data;
    const list = Array.isArray(data?.error) ? data.error : Array.isArray(data?.errors) ? data.errors : [];
    const items = list.map((e) => (typeof e === 'string' ? e : e?.message)).filter(Boolean);
    return [data?.message, ...items].filter(Boolean).join(' ') || fallback;
}
