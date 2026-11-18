/**
 * Trip rules as pure functions (no database). Business numbers come from trip.constants.js
 * and load.constants.js; the services call these and only add the database work.
 */
import { snapshotTerms as loadSnapshotTerms } from '#features/load/load.rules.js';
import { DELIVERY_REQUIRES_RECEIVER, GST_TREATMENTS, POD_CONDITIONS, POD_REJECTION, TRIP_ACTORS, TRIP_DEFAULTS, TRIP_TRANSITIONS } from './trip.constants.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** An e-way bill is required before the truck leaves when the goods are worth more than this (spec 2). */
export const EWAY_BILL_THRESHOLD_PAISE = 50000 * 100;
/** The transporter is warned this long before an e-way bill lapses while the trip is still on the road (AJ-26). */
export const EWAY_WARN_HOURS = 12;

export const ACTIVE_STATUSES = ['reported', 'loading', 'loaded', 'in_transit', 'delayed', 'reached_drop'];
/** A vehicle and driver stay held by a trip until it is completed or cancelled, so a rejected POD cannot double-book them (H7). */
export const HOLDING_STATUSES = ['planned', ...ACTIVE_STATUSES, 'delivered'];
export const SWAPPABLE_STATUSES = ACTIVE_STATUSES.filter((status) => status !== 'reached_drop');
export const FINISHED_STATUSES = ['completed', 'cancelled'];
/** PTL leg updates during transit and unloading (AJ-25, AJ-27). */
export const LEGS = { at_hub: ['in_transit', 'delayed'], out_for_delivery: ['in_transit', 'delayed'], unloading: ['reached_drop'] };

export const canTransition = (from, to) => TRIP_TRANSITIONS[from]?.includes(to) ?? false;

export const actorsFor = (to) => TRIP_ACTORS[to] ?? [];

/** Milestone column each status stamps. in_transit stamps departedAt only when leaving `loaded`. */
export const MILESTONE = {
    reported: 'reportedAt',
    loading: 'loadingStartedAt',
    loaded: 'loadedAt',
    in_transit: 'departedAt',
    reached_drop: 'reachedDropAt',
    delivered: 'deliveredAt',
    completed: 'completedAt',
    cancelled: 'cancelledAt',
};

export const autoCompleteAt = (deliveredAt) =>
    new Date(new Date(deliveredAt).getTime() + TRIP_DEFAULTS.autoCompleteDays * DAY_MS);

/** A truck not reported this long after the expected placement time counts as a miss. */
export const isPlacementMissed = (trip, now = new Date()) =>
    trip.status === 'planned' &&
    Boolean(trip.expectedPlacementAt) &&
    now.getTime() >= new Date(trip.expectedPlacementAt).getTime() + TRIP_DEFAULTS.placementGraceMinutes * 60 * 1000;

export const isAutoCompleteDue = (trip, now = new Date()) =>
    trip.status === 'delivered' && Boolean(trip.autoCompleteAt) && now >= new Date(trip.autoCompleteAt);

/** True once, 24 h before auto-complete, until the warning is stamped. */
export const shouldWarnAutoComplete = (trip, now = new Date()) =>
    trip.status === 'delivered' &&
    Boolean(trip.autoCompleteAt) &&
    !trip.autoCompleteWarnedAt &&
    now.getTime() >= new Date(trip.autoCompleteAt).getTime() - TRIP_DEFAULTS.autoCompleteWarnHours * HOUR_MS &&
    now < new Date(trip.autoCompleteAt);

/**
 * Detention in paise: whole hours (rounded up) beyond the free time, times the hourly rate.
 * Free time starts when the truck arrives and stops when work starts (BR-14).
 */
export const detentionCharge = ({ arrivedAt, startedAt, freeHours, ratePaisePerHour }) => {
    if (!arrivedAt || !startedAt || !ratePaisePerHour) return 0;
    const waited = new Date(startedAt).getTime() - new Date(arrivedAt).getTime();
    const over = waited - freeHours * HOUR_MS;
    if (over <= 0) return 0;
    return Math.ceil(over / HOUR_MS) * ratePaisePerHour;
};

/**
 * What the transporter agreed to, frozen at acceptance: the load's terms (load.rules.snapshotTerms)
 * plus the bid and the quantities freight needs. Money: `amount` stays in rupees as bid
 * (the bids table is rupees); everything new is paise.
 */
export const snapshotTerms = (load, bid) => ({
    ...loadSnapshotTerms(load),
    amount: Number(bid.currentAmount),
    vehicleCount: load.vehicleCount,
    plannedWeightKg: load.weightTons != null ? Math.round(Number(load.weightTons) * 1000 * 100) / 100 : null,
    distanceKm: load.distanceKm ?? null,
});

/**
 * Freight for ONE truck in paise.
 * per_vehicle: the bid is per truck. per_ton / per_kg: bid x weight (BR-16: the loaded weight at
 * delivery replaces the planned share). per_km: bid x route distance.
 * Returns 0 when the quantity is unknown (no charge line is written then).
 */
export const freightPaise = (terms, { weightKg } = {}) => {
    const rupees = Number(terms.amount);
    switch (terms.priceBasis) {
        case 'per_vehicle':
            return Math.round(rupees * 100);
        case 'per_ton':
            return weightKg ? Math.round(rupees * 100 * (weightKg / 1000)) : 0;
        case 'per_kg':
            return weightKg ? Math.round(rupees * 100 * weightKg) : 0;
        case 'per_km':
            return terms.distanceKm ? Math.round(rupees * 100 * terms.distanceKm) : 0;
        default:
            return 0;
    }
};

/** Planned weight share of one truck, used for the first freight estimate. */
export const plannedShareKg = (terms) => {
    const total = terms.loadType === 'PTL' ? terms.chargeableWeightKg : terms.plannedWeightKg;
    return total ? Math.round((Number(total) / (terms.vehicleCount || 1)) * 100) / 100 : null;
};

/** Per-ton and per-kg freight is re-priced on the loaded weight when the trip is delivered. */
export const repricesOnDelivery = (terms) => ['per_ton', 'per_kg'].includes(terms.priceBasis);

/** 'expired' | 'expiring' (inside the warning window or before the ETA) | 'valid' | null (no bill). */
export const ewayBillState = (validUntil, now = new Date(), etaAt = null) => {
    if (!validUntil) return null;
    const end = new Date(validUntil).getTime();
    if (end <= now.getTime()) return 'expired';
    if (end - now.getTime() <= EWAY_WARN_HOURS * HOUR_MS) return 'expiring';
    if (etaAt && end < new Date(etaAt).getTime()) return 'expiring';
    return 'valid';
};

const unprocessable = (message) => ({ status: 422, message });
const conflict = (message) => ({ status: 409, message });

/**
 * Whether the status change may go ahead given what the trip already holds plus the new input.
 * @param {object} trip current row
 * @param {string} to wanted status
 * @param {object} input request body fields (loadedWeightKg, lrNumber, etaAt, ...)
 * @param {{ declaredValuePaise?: number|null, hasPod?: boolean, now?: Date }} ctx
 * @returns {{ status: number, message: string } | null} null = fine
 */
export const transitionProblems = (trip, to, input = {}, ctx = {}) => {
    const now = ctx.now ?? new Date();
    if (!canTransition(trip.status, to)) {
        return conflict(`A trip cannot go from ${trip.status} to ${to}`);
    }
    if (trip.status === POD_REJECTION.from && to === POD_REJECTION.to) {
        return conflict('Only the customer can send a POD back, with a reason (POST /trips/:id/reject-pod)');
    }
    const eta = input.etaAt ?? trip.etaAt;
    switch (to) {
        case 'reported':
            if (!trip.vehicleId || !trip.driverId) return unprocessable('Assign a vehicle and a driver first');
            return null;
        case 'loaded': {
            const weight = input.loadedWeightKg ?? trip.loadedWeightKg;
            if (!(Number(weight) > 0)) return unprocessable('Enter the loaded weight in kg');
            if (!(input.lrNumber ?? trip.lrNumber)) return unprocessable('Enter the LR number');
            return null;
        }
        case 'in_transit': {
            if (trip.status === 'delayed') return null; // resuming after a delay
            if (!eta) return unprocessable('Enter the expected arrival time (ETA)');
            const bill = input.ewayBillNumber ?? trip.ewayBillNumber;
            const validUntil = input.ewayBillValidUntil ?? trip.ewayBillValidUntil;
            if (ctx.declaredValuePaise > EWAY_BILL_THRESHOLD_PAISE && !bill) {
                return unprocessable('An e-way bill is required for goods worth more than Rs 50,000');
            }
            if (bill && validUntil && ewayBillState(validUntil, now) === 'expired') {
                return unprocessable('The e-way bill has already expired');
            }
            return null;
        }
        case 'delayed':
            if (!input.delayReason) return unprocessable('Say why the trip is delayed');
            if (!eta) return unprocessable('Enter the new ETA');
            return null;
        case 'delivered':
            if (!POD_CONDITIONS.includes(input.podCondition)) {
                return unprocessable(`podCondition must be one of: ${POD_CONDITIONS.join(', ')}`);
            }
            if (input.podCondition === 'remarks' && !input.podRemarks) {
                return unprocessable('Write the remarks that were on the signed LR');
            }
            if (!ctx.hasPod) return unprocessable('Upload the POD (photo of the signed LR) first');
            return receiverProblem(trip, input, now);
        case 'cancelled':
            if (!input.cancelReason) return unprocessable('A reason is required to cancel');
            return null;
        default:
            return null;
    }
};

/**
 * AJ-27: who signed for the goods. Name and phone are optional until DELIVERY_REQUIRES_RECEIVER is on;
 * a phone, when given, is 10 digits; the receive time cannot be before the truck reached the drop or in the future.
 */
export const receiverProblem = (trip, input = {}, now = new Date()) => {
    const name = input.receivedBy?.trim();
    const phone = input.receivedByPhone?.trim();
    if (DELIVERY_REQUIRES_RECEIVER && (!name || !phone)) return unprocessable('Enter who received the goods (name and phone)');
    if (phone && !/^\d{10}$/.test(phone)) return unprocessable('The receiver phone must be 10 digits');
    if (input.receivedAt) {
        const at = new Date(input.receivedAt).getTime();
        if (at > now.getTime() + 5 * 60 * 1000) return unprocessable('The received time cannot be in the future');
        if (trip.reachedDropAt && at < Math.floor(new Date(trip.reachedDropAt).getTime() / 60000) * 60000) return unprocessable('The received time cannot be before the truck reached the drop');
    }
    return null;
};

/** AJ-16: a hazmat load needs a driver with a hazmat endorsement. Returns the message or null. */
export const hazmatProblem = (load, driver) =>
    load.hazmatClass && !driver.hazmatEndorsement
        ? `Load is hazmat (class ${load.hazmatClass}): driver ${driver.name} needs a hazmat endorsement`
        : null;

/** AJ-32 / Q-15: what the closure sheet shows for the declared GST treatment (null until declared). */
export const gstSheet = (treatment) =>
    GST_TREATMENTS[treatment] ? { treatment, ...GST_TREATMENTS[treatment] } : null;

/** AJ-36: an executor may step back only while the truck is still `planned` (before it reports at pickup). */
export const executorCancelsBeforePlacement = (trip, sides) => trip.status === 'planned' && Boolean(sides.executor) && !sides.customer;

/** Whether the customer may send this trip's POD back. null = fine. */
export const podRejectionProblem = (trip) =>
    trip.status === POD_REJECTION.from && canTransition(POD_REJECTION.from, POD_REJECTION.to)
        ? null
        : conflict('Only a delivered trip can have its POD rejected');

/**
 * Re-award after a missed placement (H6): only while the load is `accepted` (no truck has moved),
 * the award is the accepted one, and the miss is the open one. null = fine.
 */
export const reAwardProblem = ({ load, award, miss }) => {
    if (!miss || miss.decision) return unprocessable('There is no missed placement waiting for your decision');
    if (load.status !== 'accepted') return conflict('A load can be taken back only while it is accepted and no truck has started');
    if (!award || award.status !== 'accepted') return conflict('Only an accepted award can be taken back');
    return null;
};

/** Customers may cancel a trip only before the truck reports (spec 2). */
export const customerMayCancel = (status) => status === 'planned';

/**
 * Can this vehicle and driver take this trip today? Returns the first problem as text, or null.
 * Mirrors fleet.rules.isAssignable (not imported: that file may not exist yet).
 * shortcut: duplicated check, point it at fleet.rules.isAssignable once that lands.
 */
export const assignmentProblems = (vehicle, driver, load, today, current = {}) => {
    const reg = vehicle.registrationNumber;
    if (!vehicle.isActive || vehicle.availability === 'inactive') return `Vehicle ${reg} is not active`;
    if (vehicle.availability !== 'available' && vehicle.id !== current.vehicleId) {
        return `Vehicle ${reg} is ${String(vehicle.availability).replace('_', ' ')}`;
    }
    if (load.vehicleTypeId && vehicle.vehicleTypeId !== load.vehicleTypeId) {
        return 'This vehicle is not the truck type awarded on the load';
    }
    const docs = [
        ['RC', vehicle.rcExpiry],
        ['insurance', vehicle.insuranceExpiry],
        ['permit', vehicle.permitExpiry],
        ['fitness certificate', vehicle.fitnessExpiry],
    ];
    for (const [name, expiry] of docs) {
        if (expiry && expiry < today) return `The ${name} of ${reg} expired on ${expiry}`;
    }
    if (!driver.isActive || driver.availability === 'inactive') return `Driver ${driver.name} is not active`;
    if (driver.availability !== 'available' && driver.id !== current.driverId) {
        return `Driver ${driver.name} is ${String(driver.availability).replace('_', ' ')}`;
    }
    if (driver.licenceExpiry && driver.licenceExpiry < today) {
        return `The licence of ${driver.name} expired on ${driver.licenceExpiry}`;
    }
    return null;
};

/** Load status after a trip changed, from every trip's status. Returns the new status or null for no change. */
export const loadStatusFromTrips = (loadStatus, trips) => {
    if (!['accepted', 'in_execution'].includes(loadStatus) || trips.length === 0) return null;
    const done = trips.every((trip) => FINISHED_STATUSES.includes(trip.status));
    if (done) return trips.some((trip) => trip.status === 'completed') ? 'completed' : 'cancelled';
    if (loadStatus === 'accepted' && trips.some((trip) => trip.reportedAt)) return 'in_execution';
    return null;
};

/** "3 of 5 delivered": delivered and completed both count, cancelled trucks leave the denominator. */
export const progressOf = (trips) => {
    const live = trips.filter((trip) => trip.status !== 'cancelled');
    const delivered = live.filter((trip) => ['delivered', 'completed'].includes(trip.status)).length;
    return { total: live.length, delivered, cancelled: trips.length - live.length, label: `${delivered} of ${live.length} delivered` };
};
