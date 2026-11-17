/**
 * Pure rules for Ad Hoc loads: no database, no dates from the clock, so every rule can be
 * tested on its own (load.rules.test.js). Services call these and do the persistence.
 */
import { DEFAULTS, LOAD_NUMBER_PREFIX, PTL_DEFAULTS } from './load.constants.js';

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
    if (load.loadType === 'PTL') {
        const dims = Array.isArray(load.packageDims) ? load.packageDims : [];
        if (dims.length === 0) problems.push('PTL loads need the package sizes');
        if (!(Number(load.actualWeightKg) > 0)) problems.push('PTL loads need the actual weight in kg');
    } else if (!(Number(load.weightTons) > 0)) {
        problems.push('Total weight must be more than 0 tons');
    }
    if ((load.specialRequirements ?? []).includes('hazmat') && !(load.hazmatClass && load.unNumber)) {
        problems.push('Hazardous goods need a hazmat class and UN number');
    }
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

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * PTL chargeable weight (PRD Q-10/Q-19): the larger of actual weight, volumetric weight
 * (sum of count x L x W x H in cm, divided by 5000) and the 50 kg minimum.
 * @param {{ packageDims?: Array<{count:number,lengthCm:number,widthCm:number,heightCm:number}>, actualWeightKg?: number }} input
 * @returns {{ volumetricWeightKg: number, chargeableWeightKg: number }} kg, 2 decimals
 */
export const chargeableWeight = ({ packageDims, actualWeightKg }) => {
    const cm3 = (packageDims ?? []).reduce(
        (sum, p) => sum + Number(p.count) * Number(p.lengthCm) * Number(p.widthCm) * Number(p.heightCm),
        0,
    );
    const volumetricWeightKg = round2(cm3 / PTL_DEFAULTS.volumetricDivisor);
    const actual = Number(actualWeightKg) || 0;
    return {
        volumetricWeightKg,
        chargeableWeightKg: round2(Math.max(actual, volumetricWeightKg, PTL_DEFAULTS.minChargeableKg)),
    };
};

const positive = (v) => Number.isFinite(Number(v)) && Number(v) > 0;

/**
 * Save-time consistency of a load's FTL/PTL fields (the merged row, not just the patch).
 * Missing pieces are fine while drafting; contradictions are not.
 * @returns {string[]} problems
 */
export const shapeProblems = (load) => {
    const problems = [];
    if (load.loadType !== 'PTL' && load.priceBasis === 'per_kg') {
        problems.push('Per-kg pricing is only for part-truck (PTL) loads');
    }
    const dims = load.packageDims ?? [];
    dims.forEach((p, i) => {
        const ok =
            Number.isInteger(Number(p.count)) && positive(p.count) &&
            positive(p.lengthCm) && positive(p.widthCm) && positive(p.heightCm) &&
            (p.weightKg == null || positive(p.weightKg));
        if (!ok) problems.push(`Package line ${i + 1}: count, length, width and height must be more than 0`);
    });
    if (load.hazmatClass && !(load.specialRequirements ?? []).includes('hazmat')) {
        problems.push('Hazmat class is only for loads tagged hazmat');
    }
    return problems;
};

/**
 * Derived PTL columns for a merged load: chargeable weights, package count, weightTons, and
 * per_kg pricing forced. FTL loads get the PTL block cleared of computed values and, if they
 * still carry per_kg, fall back to per_vehicle.
 * @returns {object} column values to write
 */
export const derivedShape = (load) => {
    if (load.loadType === 'PTL') {
        const dims = load.packageDims ?? [];
        const out = { priceBasis: 'per_kg', ...chargeableWeight(load) };
        out.packageCount = dims.reduce((s, p) => s + (Number(p.count) || 0), 0) || null;
        if (positive(load.actualWeightKg)) out.weightTons = round2(Number(load.actualWeightKg) / 1000);
        return out;
    }
    return {
        volumetricWeightKg: null,
        chargeableWeightKg: null,
        ...(load.priceBasis === 'per_kg' ? { priceBasis: 'per_vehicle' } : {}),
    };
};

/** Bid total in rupees: per_kg bids are rupees per chargeable kg, everything else is the amount itself. */
export const bidTotal = (load, amount) =>
    load.priceBasis === 'per_kg' && positive(load.chargeableWeightKg)
        ? roundMoney(Number(amount) * Number(load.chargeableWeightKg))
        : roundMoney(amount);

/** What a bid amount is "per": shown next to every bid. */
export const bidUnit = (load) =>
    ({ per_kg: 'per kg', per_ton: 'per ton', per_km: 'per km' })[load.priceBasis] ?? 'per vehicle';

/** The commercial terms frozen onto the award when the transporter accepts (AJ-13). */
export const snapshotTerms = (load) => ({
    freeTimeLoadingHours: load.freeTimeLoadingHours,
    freeTimeUnloadingHours: load.freeTimeUnloadingHours,
    detentionRatePaisePerHour: load.detentionRatePaisePerHour,
    labourPayableBy: load.labourPayableBy,
    freightPayableBy: load.freightPayableBy,
    tollIncluded: load.tollIncluded,
    priceBasis: load.priceBasis,
    loadType: load.loadType,
    chargeableWeightKg: load.chargeableWeightKg ?? null,
    declaredValuePaise: load.declaredValuePaise ?? null,
    pickupPlaceKind: load.pickupPlaceKind ?? null,
    dropPlaceKind: load.dropPlaceKind ?? null,
    pickupIsOda: load.pickupIsOda,
    dropIsOda: load.dropIsOda,
    handling: load.handling ?? null,
});

/** The one automatic extension (AJ-12): null when not due, else the new close time. */
export const autoExtendTo = (load, bidCount, now) => {
    if (bidCount > 0 || !load.autoExtendOnce || load.extensionCount !== 0) return null;
    const wanted = new Date(now.getTime() + DEFAULTS.bidWindowHours * MS_PER_HOUR);
    const pickup = pickupMoment(load);
    const latest = pickup ? new Date(pickup.getTime() - MS_PER_HOUR) : wanted;
    const newClose = wanted < latest ? wanted : latest;
    return newClose > now ? newClose : null;
};
