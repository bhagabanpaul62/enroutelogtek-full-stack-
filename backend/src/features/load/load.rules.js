/**
 * Pure rules for Ad Hoc loads: no database, no dates from the clock, so every rule can be
 * tested on its own (load.rules.test.js). Services call these and do the persistence.
 */
import { DEFAULTS, LOAD_NUMBER_PREFIX } from './load.constants.js';

const MS_PER_HOUR = 60 * 60 * 1000;

/** Rounds to paise so two bids that differ only by floating-point noise rank as equal. */
export const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

/**
 * The bid calculator: base rate plus the transporter's margin.
 * @param {number} baseRate rupees
 * @param {'percent'|'fixed'} marginType
 * @param {number} marginValue percent of the base, or rupees
 * @returns {number} final bid amount in rupees, rounded to paise
 * @throws {Error} when the inputs are not positive numbers or the margin type is unknown
 */
export const computeFinalAmount = (baseRate, marginType, marginValue) => {
    const base = Number(baseRate);
    const margin = Number(marginValue);
    if (!Number.isFinite(base) || base <= 0) throw new Error('baseRate must be a positive number');
    if (!Number.isFinite(margin) || margin < 0) throw new Error('marginValue must be zero or more');
    if (marginType === 'percent') return roundMoney(base + (base * margin) / 100);
    if (marginType === 'fixed') return roundMoney(base + margin);
    throw new Error('marginType must be percent or fixed');
};

/**
 * Ranks bids on one load: lowest amount first, and when two amounts are equal the earlier
 * attempt wins (a transporter cannot overtake a rival by matching its price later).
 * @param {Array<{id: string, currentAmount: number, lastAttemptAt: Date|string}>} bids
 * @returns {Array<{id: string, rank: number}>} every bid with its 1-based rank
 */
export const rankBids = (bids) => {
    const sorted = [...bids].sort((a, b) => {
        const byAmount = Number(a.currentAmount) - Number(b.currentAmount);
        if (byAmount !== 0) return byAmount;
        return new Date(a.lastAttemptAt) - new Date(b.lastAttemptAt);
    });
    return sorted.map((bid, index) => ({ id: bid.id, rank: index + 1 }));
};

/** Human load number: AH-2026-000042. The year is the load's creation year. */
export const loadNumber = (kind, loadSeq, createdAt) => {
    const prefix = LOAD_NUMBER_PREFIX[kind] ?? 'LD';
    const year = new Date(createdAt).getUTCFullYear();
    return `${prefix}-${year}-${String(loadSeq).padStart(6, '0')}`;
};

/** Pickup dates and times are entered in Indian time; this is the only timezone the product serves. */
export const PICKUP_TZ_OFFSET = '+05:30';

/** The pickup moment: the pickup date at the start of its time window, in Indian time. */
export const pickupMoment = (load) => {
    if (!load.pickupDate) return null;
    const time = load.pickupTimeFrom || '00:00';
    return new Date(`${load.pickupDate}T${time}:00${PICKUP_TZ_OFFSET}`);
};

/**
 * Everything that must be true before a draft goes live. Returns the list of problems,
 * empty when the load can be published. Checked both at publish and by the frontend review step.
 * @param {object} load the draft row
 * @param {number} inviteeCount valid, connected transporters invited
 * @param {Date} now
 * @returns {string[]} problems, in the order the wizard shows the fields
 */
export const publishProblems = (load, inviteeCount, now = new Date()) => {
    const problems = [];
    if (!load.pickupPinCode || !load.pickupCity || !load.pickupAddress) {
        problems.push('Pickup PIN code, city and address are required');
    }
    if (!load.dropPinCode || !load.dropCity || !load.dropAddress) {
        problems.push('Drop PIN code, city and address are required');
    }
    const pickup = pickupMoment(load);
    if (!pickup) {
        problems.push('Pickup date is required');
    } else if (pickup.getTime() < now.getTime() + DEFAULTS.minPickupLeadHours * MS_PER_HOUR) {
        problems.push(`Pickup must be at least ${DEFAULTS.minPickupLeadHours} hours from now`);
    }
    if (!load.commodityId && !load.commodityOther) problems.push('Material is required');
    if (!(Number(load.weightTons) > 0)) problems.push('Total weight must be more than 0 tons');
    if (!load.vehicleTypeId) problems.push('Truck type is required');
    if (!(Number(load.vehicleCount) >= 1)) problems.push('At least one truck is required');
    if (!load.closesAt) {
        problems.push('Bidding close time is required');
    } else {
        const closes = new Date(load.closesAt);
        if (closes.getTime() <= now.getTime()) problems.push('Bidding close time must be in the future');
        if (pickup && closes.getTime() >= pickup.getTime()) {
            problems.push('Bidding must close before the pickup time');
        }
    }
    if (!(inviteeCount >= 1)) problems.push('Invite at least one connected transporter');
    return problems;
};

/** What a live load becomes when its window ends. */
export const statusAtClose = (bidCount) => (bidCount > 0 ? 'closed' : 'expired');

/**
 * Whether a transporter may place one more attempt right now.
 * @returns {{ ok: boolean, reason?: string }}
 */
export const canBid = ({ status, closesAt, attemptsUsed, maxAttempts }, now = new Date()) => {
    if (status !== 'live') return { ok: false, reason: 'Bidding is not open on this load' };
    if (new Date(closesAt).getTime() <= now.getTime()) {
        return { ok: false, reason: 'Bidding has closed on this load' };
    }
    const limit = maxAttempts ?? DEFAULTS.maxAttempts;
    if ((attemptsUsed ?? 0) >= limit) {
        return { ok: false, reason: `You have used all ${limit} bid attempts on this load` };
    }
    return { ok: true };
};

/** The moment an award lapses if the transporter stays silent. */
export const acceptByFrom = (awardedAt) =>
    new Date(new Date(awardedAt).getTime() + DEFAULTS.acceptanceHours * MS_PER_HOUR);

/** A new close time for an extension: in the future and still before pickup. */
export const extensionProblems = (load, newClosesAt, now = new Date()) => {
    const problems = [];
    const closes = new Date(newClosesAt);
    if (Number.isNaN(closes.getTime())) return ['closesAt must be a valid date and time'];
    if (closes.getTime() <= now.getTime()) problems.push('New close time must be in the future');
    const pickup = pickupMoment(load);
    if (pickup && closes.getTime() >= pickup.getTime()) {
        problems.push('Bidding must close before the pickup time');
    }
    return problems;
};
