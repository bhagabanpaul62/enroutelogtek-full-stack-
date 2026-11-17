/** ALLOCATION RULES: pure functions, no database. Unit-tested in allocation.rules.test.js. */
import { MAX_RESPOND_BY_HOURS, RECIPIENT_TYPES, RESPOND_BY_HOURS } from './allocation.constants.js';

const HOUR_MS = 3600 * 1000;

const NEXT = { offered: ['accepted', 'declined', 'expired', 'withdrawn'], accepted: [], declined: [], expired: [], withdrawn: [] };
export const canTransition = (from, to) => (NEXT[from] ?? []).includes(to);

/** Level of an offer from this kind of company: transporter 1, broker 2 (needs a parent), others cannot offer. */
export const depthFor = (companyType) => ({ transporter: 1, broker: 2 })[companyType] ?? null;

/** What a company may offer to, by the level it offers at. */
export const allowedRecipientTypes = (depth) => RECIPIENT_TYPES[depth] ?? [];

/** Trips a company can put in a new offer: it holds them, still planned, no truck, not in a live offer at this level. */
export const isEligibleTrip = (trip, { companyId, depth, liveDepths = [], parentAllocationId }) =>
    trip.executorCompanyId === companyId &&
    trip.status === 'planned' &&
    !trip.vehicleId &&
    !liveDepths.includes(depth) &&
    (depth === 1 || parentAllocationId === undefined || trip.executorAllocationId === parentAllocationId); // undefined = any parent (summary counts)

/** The first `quantity` eligible trips by seq_no; the quantity rule is sum(offered) <= free. */
export const pickTrips = (eligible, quantity) => [...eligible].sort((a, b) => a.seqNo - b.seqNo).slice(0, quantity);

/** First problem with a new offer, or null. Returns { message, status }. */
export const offerProblems = ({ depth, recipientType, quantity, free, ratePaise, offererType }) => {
    if (depthFor(offererType) !== depth) return { message: 'Your company type cannot offer trucks here', status: 403 };
    if (!allowedRecipientTypes(depth).includes(recipientType)) {
        return { message: `At this level trucks can be offered only to: ${allowedRecipientTypes(depth).join(', ').replace(/_/g, ' ')}`, status: 422 };
    }
    if (!Number.isInteger(ratePaise) || ratePaise <= 0) return { message: 'Rate per truck must be more than zero', status: 422 };
    if (!Number.isInteger(quantity) || quantity < 1) return { message: 'Quantity must be at least 1', status: 422 };
    if (quantity > free) return { message: `Only ${free} trucks are free to offer`, status: 409 };
    return null;
};

/** respond_by = now + hours (default 24), never later than the earliest planned truck placement. */
export const respondByFor = (now, hours, earliestPlacement) => {
    const h = Math.min(Math.max(Number(hours) || RESPOND_BY_HOURS, 1), MAX_RESPOND_BY_HOURS);
    const at = new Date(now.getTime() + h * HOUR_MS);
    return earliestPlacement && earliestPlacement.getTime() > now.getTime() && earliestPlacement < at ? new Date(earliestPlacement) : at;
};

export const isExpired = (allocation, now = new Date()) => allocation.status === 'offered' && new Date(allocation.respondBy) <= now;
export const canAnswer = (allocation, now = new Date()) => allocation.status === 'offered' && new Date(allocation.respondBy) > now;

/** A company reads an allocation only if it is on it, or owns the award (the transporter). */
export const canSee = (allocation, companyId, awardTransporterId) =>
    [allocation.fromCompanyId, allocation.toCompanyId, awardTransporterId].includes(companyId);

/** The rate is hidden from the award's transporter on a depth-2 row (the broker's margin). */
export const rateVisible = (allocation, companyId, awardTransporterId) =>
    allocation.fromCompanyId === companyId || allocation.toCompanyId === companyId
        ? true
        : !(awardTransporterId === companyId && allocation.depth === 2);

export const presentRate = (allocation, companyId, awardTransporterId) =>
    rateVisible(allocation, companyId, awardTransporterId) ? allocation.ratePerTruckPaise : null;
