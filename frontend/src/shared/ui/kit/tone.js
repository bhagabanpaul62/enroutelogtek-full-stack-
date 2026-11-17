/**
 * The only four meaning colours in the app, plus neutral. Every chip, dot, progress fill and
 * "needs action" number takes its colour from here, so one status looks the same everywhere.
 * Colour is a function: if a value has no severity (owner, source, type) it is neutral.
 */
export const TONE = {
    success: { dot: 'bg-emerald-400', text: 'text-emerald-300', soft: 'bg-emerald-400/10', fill: 'bg-emerald-400' },
    warning: { dot: 'bg-amber-400', text: 'text-amber-300', soft: 'bg-amber-400/10', fill: 'bg-amber-400' },
    danger: { dot: 'bg-red-400', text: 'text-red-300', soft: 'bg-red-400/10', fill: 'bg-red-400' },
    info: { dot: 'bg-sky-400', text: 'text-sky-300', soft: 'bg-sky-400/10', fill: 'bg-sky-400' },
    accent: { dot: 'bg-primary', text: 'text-primary', soft: 'bg-primary/10', fill: 'bg-primary' },
    neutral: { dot: 'bg-white/40', text: 'text-foreground/70', soft: 'bg-white/[0.06]', fill: 'bg-white/40' },
};

/**
 * Status value (as the API sends it) → tone and label. One table for every lifecycle in the app:
 * loads, bids, awards, trips, contracts, companies, connections, members, subscriptions.
 * Add new statuses here, never as a local colour in a component.
 */
export const STATUS = {
    // companies, members, connections
    draft: { tone: 'neutral', label: 'Draft' },
    pending: { tone: 'warning', label: 'Pending' },
    approved: { tone: 'success', label: 'Approved' },
    rejected: { tone: 'danger', label: 'Rejected' },
    blocked: { tone: 'danger', label: 'Blocked' },
    accepted: { tone: 'success', label: 'Accepted' },
    active: { tone: 'success', label: 'Active' },
    inactive: { tone: 'neutral', label: 'Inactive' },
    // loads and RFQs
    live: { tone: 'accent', label: 'Live' },
    open: { tone: 'accent', label: 'Open' },
    closed: { tone: 'info', label: 'Closed' },
    expired: { tone: 'neutral', label: 'Expired' },
    awarded: { tone: 'info', label: 'Awarded' },
    in_execution: { tone: 'accent', label: 'In execution' },
    completed: { tone: 'success', label: 'Completed' },
    cancelled: { tone: 'neutral', label: 'Cancelled' },
    declined: { tone: 'danger', label: 'Declined' },
    revoked: { tone: 'danger', label: 'Revoked' },
    // trips (Wave 2)
    planned: { tone: 'neutral', label: 'Planned' },
    reported: { tone: 'info', label: 'At pickup' },
    loading: { tone: 'info', label: 'Loading' },
    loaded: { tone: 'info', label: 'Loaded' },
    in_transit: { tone: 'accent', label: 'In transit' },
    delayed: { tone: 'warning', label: 'Delayed' },
    reached_drop: { tone: 'accent', label: 'At drop' },
    delivered: { tone: 'success', label: 'Delivered' },
    // trip charges
    proposed: { tone: 'warning', label: 'Proposed' },
    // vehicles and drivers
    available: { tone: 'success', label: 'Available' },
    on_trip: { tone: 'info', label: 'On trip' },
    maintenance: { tone: 'warning', label: 'Maintenance' },
    off_duty: { tone: 'warning', label: 'Off duty' },
    // money
    paid: { tone: 'success', label: 'Paid' },
    failed: { tone: 'danger', label: 'Failed' },
};

/** Tone for a status; unknown values are neutral and labelled from the raw value. */
export function statusMeta(value) {
    if (value == null || value === '') return null;
    return STATUS[value] ?? { tone: 'neutral', label: String(value).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) };
}

/** The kit passes "default" for no tone; the app calls it "neutral". */
export const toneOf = (tone) => TONE[tone === 'default' || !tone ? 'neutral' : tone] ?? TONE.neutral;

/** Chip = tinted pill: the tone's soft fill + its text colour. */
export const toneChip = (tone) => `${toneOf(tone).soft} ${toneOf(tone).text}`;

/** SVG stroke classes (SVG strokes cannot use the bg-* fill classes above). */
export const TONE_STROKE = {
    default: 'stroke-white/55',
    neutral: 'stroke-white/55',
    success: 'stroke-emerald-400',
    warning: 'stroke-amber-400',
    danger: 'stroke-red-400',
    info: 'stroke-sky-400',
    accent: 'stroke-primary',
};
