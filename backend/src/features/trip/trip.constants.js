/** Trip settings in one place (PRD section 4). Spec: docs/superpowers/specs/2026-11-17-adhoc-execution-design.md */
export const TRIP_STATUSES = [
    'planned',
    'reported',
    'loading',
    'loaded',
    'in_transit',
    'delayed',
    'reached_drop',
    'delivered',
    'completed',
    'cancelled',
];

/**
 * from -> allowed next statuses. Who may do each is in the spec (TRIP_ACTORS below).
 * delayed is a side state of in_transit: from delayed the trip goes back to in_transit or on to reached_drop.
 */
export const TRIP_TRANSITIONS = {
    planned: ['reported', 'cancelled'],
    reported: ['loading', 'cancelled'],
    loading: ['loaded', 'cancelled'],
    loaded: ['in_transit', 'cancelled'],
    in_transit: ['delayed', 'reached_drop'],
    delayed: ['in_transit', 'reached_drop'],
    reached_drop: ['delivered'],
    delivered: ['completed', 'reached_drop'], // delivered -> reached_drop only by POD rejection (customer), see POD_REJECTION
    completed: [],
    cancelled: [],
};

/** who may make a transition: executor (transporter/executor with trips.update), customer, system */
export const TRIP_ACTORS = {
    reported: ['executor'],
    loading: ['executor'],
    loaded: ['executor'],
    in_transit: ['executor'],
    delayed: ['executor'],
    reached_drop: ['executor'],
    delivered: ['executor'],
    completed: ['customer', 'system'],
    cancelled: ['executor', 'customer'], // customer only while planned; executor needs a reason
};

/** The one backward step: the customer sends a POD back. Never reachable through /transition. */
export const POD_REJECTION = { from: 'delivered', to: 'reached_drop', who: 'customer' };

export const CHARGE_KINDS = ['freight', 'detention', 'labour', 'toll', 'other'];
export const CHARGE_STATUSES = ['proposed', 'approved', 'rejected'];
export const DISCREPANCY_KINDS = ['shortage', 'damage', 'rejected'];
export const POD_CONDITIONS = ['clean', 'remarks'];

export const TRIP_DEFAULTS = {
    autoCompleteDays: 7,
    autoCompleteWarnHours: 24,
    placementGraceMinutes: 60, // a truck not reported this long after expected placement counts as a miss
};

export const DEFAULT_TRIP_PAGE_LIMIT = 20;
export const TRIP_DOCUMENT_TYPES = ['lr', 'pod', 'eway_bill', 'weighbridge', 'invoice_copy', 'closure_sheet'];
export const EXECUTOR_CHARGE_KINDS = ['detention', 'labour', 'toll', 'other'];
export const DISCREPANCY_UNITS = ['packages', 'kg', 'tons'];
export const PLACEMENT_DECISIONS = ['re_award', 'cancel'];
export const LEG_NAMES = ['at_hub', 'out_for_delivery', 'unloading'];

/** AJ-32 / Q-15: the transporter declares how GST applies; the sheet shows the rate and whether the customer gets ITC. */
export const GST_TREATMENTS = {
    rcm: { label: 'Reverse charge (RCM)', ratePct: 5, customerItc: false },
    forward: { label: 'Forward charge', ratePct: 12, customerItc: true },
};
/** AJ-27: set true to make the receiver's name and phone mandatory at delivery (the UI must send them first). */
export const DELIVERY_REQUIRES_RECEIVER = false;
export const PLACEMENT_SOURCES = ['late', 'executor_cancel'];
