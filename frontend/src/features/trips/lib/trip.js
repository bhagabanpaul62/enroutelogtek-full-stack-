import { STATUS } from '@/shared/ui/kit';
import { formatDate, formatDateTime, formatMoney } from '@/shared/ui/data-grid';
import { formatRoute } from '@/shared/lib/format.js';
import { TRIP_TONES, TRANSITIONS, TRIP_PERMISSIONS } from '../constants';

export { formatDate, formatDateTime, formatMoney };

/** Tone and label for a trip or charge status: tone.js first, then the local fallback. */
export const tripStatusMeta = (status) =>
    !status ? null : STATUS[status] ?? TRIP_TONES[status] ?? { tone: 'neutral', label: String(status).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) };

/** "Pune → Chennai" from a load's public fields (or a row that already carries `route`). */
export const routeOf = (load) => {
    if (!load) return '';
    if (load.route) return load.route;
    const from = load.pickupCity || load.pickupPinCode;
    const to = load.dropCity || load.dropPinCode;
    return formatRoute(from, to);
};

export const registrationOf = (v) => v?.registrationNumber ?? '';

/** A list row in one flat shape, whichever way the API nests it. */
export function rowView(row) {
    const trip = row.trip ?? row;
    const load = row.load ?? {};
    const vehicle = row.vehicle ?? null;
    const driver = row.driver ?? null;
    const seq = trip.seqNo ?? row.seqNo;
    const loadNumber = row.loadNumber ?? load.loadNumber ?? '';
    return {
        id: trip.id,
        tripNo: trip.tripNumber ?? row.tripNumber ?? (loadNumber ? `${loadNumber}-${seq ?? 1}` : `Trip ${seq ?? ''}`.trim()),
        loadId: trip.loadId ?? row.loadId ?? load.id,
        loadNumber,
        route: row.route ?? routeOf(row.load ?? row),
        status: trip.status,
        vehicle: row.vehicleRegistration ?? registrationOf(vehicle),
        driverName: row.driverName ?? driver?.name ?? '',
        driverPhone: row.driverPhone ?? driver?.phone ?? '',
        etaAt: trip.etaAt ?? null,
        expectedPlacementAt: trip.expectedPlacementAt ?? null,
        delayed: isDelayed(trip),
        pod: podState(trip, row.hasPod ?? row.podUploaded),
        lastEvent: row.lastEvent ?? null,
    };
}

export const isDelayed = (trip, now = Date.now()) =>
    trip.status === 'delayed' || (['in_transit', 'delayed'].includes(trip.status) && trip.etaAt && new Date(trip.etaAt).getTime() < now);

/** POD column: waiting until the trip is at the drop, then pending, then uploaded. */
export const podState = (trip, hasPod) => {
    if (trip.deliveredAt || ['delivered', 'completed'].includes(trip.status) || hasPod) return 'Uploaded';
    if (trip.status === 'reached_drop') return 'Pending';
    return '';
};

/**
 * What the signed-in user may do next on a trip.
 * side: 'customer' | 'executor'. can: (permissionKey) => boolean.
 */
export function allowedActions(trip, { side, can }) {
    const next = TRANSITIONS[trip.status] ?? [];
    if (side === 'customer') {
        const out = [];
        if (trip.status === 'delivered' && can(TRIP_PERMISSIONS.LOADS_AWARD)) out.push('confirm');
        if (trip.status === 'planned' && can(TRIP_PERMISSIONS.LOADS_MANAGE)) out.push('cancelled');
        return out;
    }
    if (!can(TRIP_PERMISSIONS.TRIPS_UPDATE)) return [];
    return next.filter((to) => to !== 'completed');
}

export const money = (paise) => (paise == null ? '' : formatMoney(Number(paise)));
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

/** ISO -> value for <input type="datetime-local"> in local time, and back. */
export const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : undefined);

/** Days from now to a date; negative when past. null when no date. */
export const daysUntil = (value, now = Date.now()) => (value ? Math.ceil((new Date(value).getTime() - now) / 86_400_000) : null);
