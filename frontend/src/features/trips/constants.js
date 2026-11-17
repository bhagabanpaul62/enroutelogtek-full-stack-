// Trip settings for the UI. Mirrors backend/src/features/trip/trip.constants.js; the API is the judge.

// Permission keys (shared/lib/permissions.js is owned elsewhere and has no trip keys yet).
export const TRIP_PERMISSIONS = Object.freeze({
    TRIPS_UPDATE: 'trips.update',
    TRIPS_ASSIGN: 'trips.assign',
    FLEET_MANAGE: 'fleet.manage',
    LOADS_MANAGE: 'loads.manage',
    LOADS_AWARD: 'loads.award',
});

export const ACTIVE_STATUSES = ['planned', 'reported', 'loading', 'loaded', 'in_transit', 'delayed', 'reached_drop', 'delivered'];

/** Milestones shown on the Timeline, in order. `delayed` is a side state of in_transit. */
export const MILESTONES = [
    { status: 'planned', label: 'Trip planned', at: 'createdAt' },
    { status: 'reported', label: 'Reported at pickup', at: 'reportedAt' },
    { status: 'loading', label: 'Loading', at: 'loadingStartedAt' },
    { status: 'loaded', label: 'Loaded', at: 'loadedAt' },
    { status: 'in_transit', label: 'In transit', at: 'departedAt' },
    { status: 'reached_drop', label: 'Reached drop', at: 'reachedDropAt' },
    { status: 'delivered', label: 'Delivered, POD uploaded', at: 'deliveredAt' },
    { status: 'completed', label: 'Completed', at: 'completedAt' },
];

export const STATUS_ORDER = ['planned', 'reported', 'loading', 'loaded', 'in_transit', 'delayed', 'reached_drop', 'delivered', 'completed'];

/** from -> allowed next statuses (same table as the backend). */
export const TRANSITIONS = {
    planned: ['reported', 'cancelled'],
    reported: ['loading', 'cancelled'],
    loading: ['loaded', 'cancelled'],
    loaded: ['in_transit', 'cancelled'],
    in_transit: ['delayed', 'reached_drop'],
    delayed: ['in_transit', 'reached_drop'],
    reached_drop: ['delivered'],
    delivered: ['completed'],
    completed: [],
    cancelled: [],
};

/** Button words for each move. */
export const ACTION_LABELS = {
    reported: 'Mark reported at pickup',
    loading: 'Start loading',
    loaded: 'Mark loaded',
    in_transit: 'Depart',
    delayed: 'Report a delay',
    reached_drop: 'Reached drop',
    delivered: 'Deliver with POD',
    cancelled: 'Cancel trip',
};

/** Back to transit from delayed reads differently from the first departure. */
export const actionLabel = (from, to) => (from === 'delayed' && to === 'in_transit' ? 'Resume transit' : ACTION_LABELS[to] ?? to);

/** Tone names for statuses tone.js does not know yet (fallback; tone.js wins once they are added there). */
export const TRIP_TONES = {
    planned: { tone: 'neutral', label: 'Planned' },
    reported: { tone: 'info', label: 'At pickup' },
    loading: { tone: 'info', label: 'Loading' },
    loaded: { tone: 'info', label: 'Loaded' },
    in_transit: { tone: 'accent', label: 'In transit' },
    delayed: { tone: 'warning', label: 'Delayed' },
    reached_drop: { tone: 'accent', label: 'At drop' },
    delivered: { tone: 'success', label: 'Delivered' },
    proposed: { tone: 'warning', label: 'Proposed' },
};

export const DOC_TYPES = [
    { value: 'lr', label: 'LR' },
    { value: 'eway_bill', label: 'E-way bill' },
    { value: 'weighbridge', label: 'Weighbridge slip' },
    { value: 'invoice_copy', label: 'Invoice copy' },
    { value: 'pod', label: 'POD' },
];
export const DOC_LABELS = Object.fromEntries([...DOC_TYPES.map((d) => [d.value, d.label]), ['closure_sheet', 'Closure sheet'], ['discrepancy_photo', 'Discrepancy photo']]);

export const CHARGE_KINDS = [
    { value: 'detention', label: 'Detention' },
    { value: 'labour', label: 'Labour' },
    { value: 'toll', label: 'Toll' },
    { value: 'other', label: 'Other' },
];
export const CHARGE_LABELS = { freight: 'Freight', detention: 'Detention', labour: 'Labour', toll: 'Toll', other: 'Other' };

export const DELAY_REASONS = ['Breakdown', 'Weather', 'Strike or bandh', 'RTO or police check', 'Driver issue', 'Traffic', 'Other'];

export const POD_CONDITIONS = [
    { value: 'clean', label: 'Clean, no remarks' },
    { value: 'remarks', label: 'Remarks on the LR' },
];

export const DISCREPANCY_KINDS = [
    { value: 'shortage', label: 'Shortage' },
    { value: 'damage', label: 'Damage' },
];
export const DISCREPANCY_UNITS = [
    { value: 'packages', label: 'Packages' },
    { value: 'kg', label: 'kg' },
    { value: 'tons', label: 'Tons' },
];

/** E-way bill is required before departure above this declared value (spec section 2). */
export const EWAY_BILL_THRESHOLD_PAISE = 50_000 * 100;
