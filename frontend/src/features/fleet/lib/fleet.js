/* Pure helpers shared by the fleet screens. Rules mirror backend fleet.rules.js. */

import { MAX_PHONE_DIGITS } from '@/shared/lib/phone';

export const EXPIRING_DAYS = 30;

export const VEHICLE_AVAILABILITY = [
    { value: 'available', label: 'Available' },
    { value: 'on_trip', label: 'On trip', tone: 'info' },
    { value: 'maintenance', label: 'Maintenance', tone: 'warning' },
    { value: 'inactive', label: 'Inactive' },
];
export const DRIVER_AVAILABILITY = [
    { value: 'available', label: 'Available' },
    { value: 'on_trip', label: 'On trip', tone: 'info' },
    { value: 'off_duty', label: 'Off duty', tone: 'warning' },
    { value: 'inactive', label: 'Inactive' },
];
// on_trip is set by the trip service only, so it is never a choice in a form.
export const editableAvailability = (list) => list.filter((o) => o.value !== 'on_trip');

export const VEHICLE_DOCS = [
    { key: 'rc', label: 'RC', numberKey: 'rcNumber', expiryKey: 'rcExpiry', required: true },
    { key: 'insurance', label: 'Insurance', numberKey: 'insuranceNumber', expiryKey: 'insuranceExpiry', required: true },
    { key: 'permit', label: 'Permit', numberKey: 'permitNumber', expiryKey: 'permitExpiry' },
    { key: 'fitness', label: 'Fitness', numberKey: 'fitnessNumber', expiryKey: 'fitnessExpiry' },
    { key: 'puc', label: 'PUC', numberKey: null, expiryKey: 'pucExpiry' },
];
export const DRIVER_DOCS = [{ key: 'licence', label: 'Licence', numberKey: 'licenceNumber', expiryKey: 'licenceExpiry', required: true }];

const DAY = 86_400_000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole days from today to a YYYY-MM-DD / ISO date (negative = past). null when no date. */
export function daysUntil(value, now = new Date()) {
    if (!value) return null;
    const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
    if (Number.isNaN(d.getTime())) return null;
    return Math.round((startOfDay(d) - startOfDay(now)) / DAY);
}

/** valid | expiring | expired | missing. */
export function docState(expiry, now) {
    const days = daysUntil(expiry, now);
    if (days === null) return 'missing';
    if (days < 0) return 'expired';
    return days < EXPIRING_DAYS ? 'expiring' : 'valid';
}

export const STATE_TONE = { valid: 'success', expiring: 'warning', expired: 'danger', missing: 'neutral' };
export const STATE_LABEL = { valid: 'Valid', expiring: 'Expiring soon', expired: 'Expired', missing: 'Not added' };

/** Soonest expiry across a record's documents: { label, date, days, state } or null. */
export function nextExpiry(record, docs, now) {
    let best = null;
    for (const doc of docs) {
        const date = record[doc.expiryKey];
        const days = daysUntil(date, now);
        if (days === null) continue;
        if (!best || days < best.days) best = { label: doc.label, date, days, state: docState(date, now) };
    }
    return best;
}

export const expiryText = (days) =>
    days < 0 ? `expired ${-days} day${days === -1 ? '' : 's'} ago` : days === 0 ? 'expires today' : `in ${days} day${days === 1 ? '' : 's'}`;

/** Same normalisation as the backend: letters and digits only, upper case. */
export const normaliseRegistration = (raw) => String(raw ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();
export const digitsOnly = (raw) => String(raw ?? '').replace(/\D/g, '');

const today = () => new Date().toISOString().slice(0, 10);

/** Returns { field: message } ; empty object = valid. */
export function validateVehicle(f, { isEdit } = {}) {
    const e = {};
    const reg = normaliseRegistration(f.registrationNumber);
    if (reg.length < 8 || reg.length > 11) e.registrationNumber = 'Enter the registration number, 8 to 11 letters and digits (e.g. MH12AB1234).';
    if (!f.vehicleTypeId) e.vehicleTypeId = 'Pick a vehicle type.';
    if (!(Number(f.capacityTons) > 0)) e.capacityTons = 'Enter the capacity in tons.';
    if (!f.rcNumber?.trim()) e.rcNumber = 'RC number is required.';
    if (!f.rcExpiry) e.rcExpiry = 'RC expiry is required.';
    if (!f.insuranceNumber?.trim()) e.insuranceNumber = 'Insurance number is required.';
    if (!f.insuranceExpiry) e.insuranceExpiry = 'Insurance expiry is required.';
    for (const [num, exp] of [['permitNumber', 'permitExpiry'], ['fitnessNumber', 'fitnessExpiry']]) {
        if (f[num]?.trim() && !f[exp]) e[exp] = 'Add the expiry date.';
    }
    if (!isEdit) {
        // A new truck with an expired paper can never be assigned, so say so before saving.
        for (const k of ['rcExpiry', 'insuranceExpiry']) if (f[k] && f[k] < today() && !e[k]) e[k] = 'This date has passed. Renew the document first.';
    }
    return e;
}

export function validateDriver(f) {
    const e = {};
    if (!f.name?.trim()) e.name = 'Enter the driver name.';
    if (digitsOnly(f.phone).length < 10) e.phone = 'Enter a 10 digit mobile number.';
    else if (digitsOnly(f.phone).length > MAX_PHONE_DIGITS) e.phone = `Enter up to ${MAX_PHONE_DIGITS} digits`;
    if (!f.licenceNumber?.trim()) e.licenceNumber = 'Licence number is required.';
    if (!f.licenceExpiry) e.licenceExpiry = 'Licence expiry is required.';
    if (f.yearsExperience !== '' && f.yearsExperience != null && !(Number(f.yearsExperience) >= 0 && Number(f.yearsExperience) <= 60)) e.yearsExperience = 'Enter 0 to 60 years.';
    return e;
}

export const apiError = (error, fallback = 'Something went wrong. Please try again.') => error.response?.data?.message || fallback;
// Per-field errors from the API (validationErrorResponse): { errors: { field: msg } }
export const apiFieldErrors = (error) => {
    const raw = error.response?.data?.errors;
    return raw && typeof raw === 'object' ? Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string' && v)) : {};
};

export const dateInput = (v) => (v ? String(v).slice(0, 10) : '');
