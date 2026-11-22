/** Fleet rules: pure functions (no database). Spec: docs/superpowers/specs/2026-11-17-adhoc-execution-design.md section 4. */

export const EXPIRY_WARN_DAYS = 30;
export const REMINDER_BUCKETS = [30, 7]; // days before expiry; 0 = already expired
export const VEHICLE_DOC_KINDS = ['rc', 'insurance', 'permit', 'fitness', 'puc'];
export const DOC_LABELS = {
    rc: 'RC',
    insurance: 'Insurance',
    permit: 'Permit',
    fitness: 'Fitness certificate',
    puc: 'PUC',
    licence: 'Driving licence',
};
const MS_PER_DAY = 86400000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Today's date (YYYY-MM-DD) in India, where the fleets run. */
export const todayIST = (now = new Date()) => new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

/**
 * Indian registration: WB23C4471, WB 23 C 4471, WB-23-C-4471 -> "WB23C4471". Also the Bharat series
 * (22BH1234AA). Returns null when it does not look like one (8 to 11 characters).
 */
export function normaliseRegistration(raw) {
    if (typeof raw !== 'string') return null;
    const value = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (value.length < 8 || value.length > 11) return null;
    const state = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/; // WB23C4471, MH12AB1234, DL1CAB1234
    const bharat = /^\d{2}BH\d{4}[A-Z]{1,2}$/;
    return state.test(value) || bharat.test(value) ? value : null;
}

/** Indian mobile: digits only, drops +91 / 0 prefix. Returns 10 digits or null. */
export function normalisePhone(raw) {
    if (typeof raw !== 'string' && typeof raw !== 'number') return null;
    let digits = String(raw).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Whole days from today to the expiry date (negative = past). Null when there is no expiry. */
export function daysLeft(expiry, today) {
    if (!expiry) return null;
    return Math.round((Date.parse(`${expiry}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / MS_PER_DAY);
}

/** valid | expiring (within 30 days, today included) | expired. Null when no expiry is on file. */
export function docStatus(expiry, today) {
    const left = daysLeft(expiry, today);
    if (left === null) return null;
    if (left < 0) return 'expired';
    return left <= EXPIRY_WARN_DAYS ? 'expiring' : 'valid';
}

const vehicleExpiries = (vehicle) => ({
    rc: vehicle.rcExpiry,
    insurance: vehicle.insuranceExpiry,
    permit: vehicle.permitExpiry,
    fitness: vehicle.fitnessExpiry,
    puc: vehicle.pucExpiry,
});

/** { rc, insurance, permit, fitness, puc } each valid | expiring | expired | null */
export function vehicleDocStatus(vehicle, today) {
    return Object.fromEntries(Object.entries(vehicleExpiries(vehicle)).map(([k, v]) => [k, docStatus(v, today)]));
}

/**
 * Whether a vehicle or driver can be put on a trip now. Expired RC / insurance / permit / fitness
 * (vehicle) or licence (driver) blocks it; an expired PUC only warns. A row with registrationNumber is a vehicle.
 * @returns {{ ok: boolean, reason: string | null }}
 */
export function isAssignable(entity, today) {
    if (!entity.isActive || entity.deletedAt) return { ok: false, reason: 'Not active' };
    if (entity.availability !== 'available') return { ok: false, reason: `Not available (${entity.availability})` };
    const isVehicle = 'registrationNumber' in entity;
    const checks = isVehicle
        ? ['rc', 'insurance', 'permit', 'fitness'].map((k) => [k, vehicleExpiries(entity)[k]])
        : [['licence', entity.licenceExpiry]];
    for (const [kind, expiry] of checks) {
        if (docStatus(expiry, today) === 'expired') {
            return { ok: false, reason: `${DOC_LABELS[kind]} expired on ${expiry}` };
        }
    }
    return { ok: true, reason: null };
}

/**
 * Why a vehicle cannot be picked for a load that needs `required` ({ id, name }), or null when it can.
 * The truck-type rule is real (the trip check enforces it), so the picker names it instead of hiding the truck.
 */
export function pickerProblem(vehicle, required, today) {
    if (required?.id && vehicle.vehicleTypeId !== required.id) {
        const has = vehicle.vehicleTypeName ? `is a ${vehicle.vehicleTypeName}` : 'has a different truck type';
        return `This load needs a ${required.name ?? 'different truck type'}; ${vehicle.registrationNumber} ${has}. Change its type under Fleet to use it.`;
    }
    return isAssignable(vehicle, today).reason;
}

/**
 * Documents of one vehicle or driver that expire within `withinDays` (or already have), soonest first.
 * @returns {{ kind: string, label: string, expiry: string, daysLeft: number, status: string }[]}
 */
export function expiringDocs(entity, today, withinDays = EXPIRY_WARN_DAYS) {
    const expiries = 'registrationNumber' in entity ? vehicleExpiries(entity) : { licence: entity.licenceExpiry };
    return Object.entries(expiries)
        .filter(([, expiry]) => expiry)
        .map(([kind, expiry]) => ({
            kind,
            label: DOC_LABELS[kind],
            expiry,
            daysLeft: daysLeft(expiry, today),
            status: docStatus(expiry, today),
        }))
        .filter((doc) => doc.daysLeft <= withinDays)
        .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Which reminder a document is due for: 0 (expired), 7, 30, or null (nothing yet). */
export function reminderBucket(left) {
    if (left === null || left === undefined) return null;
    if (left < 0) return 0;
    if (left <= 7) return 7;
    return left <= 30 ? 30 : null;
}

/** Idempotency key: one reminder per document, expiry date and bucket. A renewed document gets a new expiry, so a new key. */
export const reminderKey = (entityType, entityId, kind, expiry, bucket) =>
    `${entityType}:${entityId}:${kind}:${expiry}:${bucket}`;
