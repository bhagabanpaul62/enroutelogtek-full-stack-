import { formatDate, formatINR } from '@/shared/lib/format';

// Mirror of backend permissions (team.permissions.js); shared/lib/permissions.js has no entry yet.
export const ALLOC_PERMS = { manage: 'allocations.manage', respond: 'offers.respond' };

// Local options for StatusChip until tone.js carries `offered` and `withdrawn`.
export const ALLOC_STATUS = [
    { value: 'offered', label: 'Offered', tone: 'info' },
    { value: 'accepted', label: 'Accepted', tone: 'success' },
    { value: 'declined', label: 'Declined', tone: 'danger' },
    { value: 'expired', label: 'Expired', tone: 'warning' },
    { value: 'withdrawn', label: 'Withdrawn', tone: 'neutral' },
];

export const RESPOND_BY_HOURS = [6, 12, 24, 48, 72];
export const TYPE_LABEL = { fleet_owner: 'Fleet owner', broker: 'Broker', transporter: 'Transporter' };

/** Rupees typed by a person -> integer paise; null when not a positive amount. */
export function rupeesToPaise(text) {
    const n = Number(String(text).replace(/,/g, '').trim());
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** "in 5 h 20 m" / "in 12 min" / "Closed". */
export function countdown(respondBy, now = Date.now()) {
    const ms = new Date(respondBy).getTime() - now;
    if (!Number.isFinite(ms)) return '';
    if (ms <= 0) return 'Closed';
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'under 1 min';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    return h >= 48 ? `${Math.floor(h / 24)} days` : `${h} h ${m % 60} m`;
}

/** Why an offer was withdrawn: the reason the API sends (cancel or re-award writes one), else a plain fallback. */
export const withdrawReason = (a) => a.withdrawNote || a.decisionNote || 'Withdrawn, for example because the load was cancelled or the award was taken back. The trucks are free again.';

/** An offer can still be answered or withdrawn only while `offered` and before respond-by. */
export const isOpen = (a, now = Date.now()) => a.status === 'offered' && new Date(a.respondBy).getTime() > now;

export const money = (paise) => (paise == null ? '' : formatINR(paise));
export const lane = (a) => [a.origin ?? a.load?.origin, a.destination ?? a.load?.destination].filter(Boolean).join(' → ') || a.loadNumber || '';
export const when = (v) => formatDate(v);

/** Total money a row stands for: trucks x rate (both known). */
export const total = (a) => (a.ratePerTruckPaise == null ? null : a.ratePerTruckPaise * a.quantity);
