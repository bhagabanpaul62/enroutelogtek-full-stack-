// Display helpers for loads. Everything is shown in Indian time and rupees.

import { formatDate as sharedDate, formatDateTime as sharedDateTime, formatINR } from '@/shared/lib/format';

/** 61480 → "₹61,480"; null → "—". Loads store rupees; the shared formatter takes paise. */
export const formatRupees = (amount) =>
    amount === null || amount === undefined || amount === '' || Number.isNaN(Number(amount))
        ? '—'
        : formatINR(Math.round(Number(amount) * 100));

/** "2026-11-12" → "Nov 12" (year only when it is not this year) */
export const formatDate = (isoDate) => sharedDate(isoDate) || '—';

/** ISO timestamp → "Nov 12, 9:00 am" (IST) */
export const formatDateTime = (iso) => sharedDateTime(iso) || '—';

/** "09:00" + "12:00" → "09:00 to 12:00"; one side only → that side; none → "any time" */
export const formatTimeWindow = (from, to) => {
    if (from && to) return `${from} to ${to}`;
    return from || to || 'any time';
};

/** ms until a timestamp → "3 h 20 m", "45 m", "2 d 4 h", or "" when passed */
export const formatCountdown = (iso, now = Date.now()) => {
    if (!iso) return '';
    const ms = new Date(iso).getTime() - now;
    if (ms <= 0) return '';
    const minutes = Math.floor(ms / 60000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    if (days > 0) return `${days} d ${hours} h`;
    if (hours > 0) return `${hours} h ${mins} m`;
    return `${mins} m`;
};

/** For <input type="datetime-local">: ISO → "YYYY-MM-DDTHH:MM" in the browser's local time. */
export const toLocalInputValue = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** The route in one line: "Kolkata → New Delhi" */
export const formatRoute = (load) =>
    [load.pickupCity || load.pickupPinCode || '?', load.dropCity || load.dropPinCode || '?'].join(' → ');

/** A bid or award amount with its unit: "₹58,000" per truck, "₹56.50/kg" for a part load. */
export const formatBid = (amount, priceBasis) => `${formatRupees(amount)}${priceBasis === 'per_kg' ? '/kg' : ''}`;

/** Total in rupees of a ₹ per kg amount on the chargeable weight, rounded to paise. */
export const perKgTotal = (amountPerKg, chargeableWeightKg) => Math.round(Number(amountPerKg) * Number(chargeableWeightKg) * 100) / 100;
