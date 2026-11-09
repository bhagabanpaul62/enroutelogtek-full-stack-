// Labels and lists for Ad Hoc loads. Values must match backend/src/features/load/load.constants.js.

export const LOAD_STATUS_LABELS = {
    draft: 'Draft',
    live: 'Live, bidding open',
    closed: 'Bidding closed',
    expired: 'No bids',
    awarded: 'Winner picked, waiting',
    accepted: 'Accepted',
    in_execution: 'In transit',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

// Which colour a status pill takes (see StatusBadge).
export const LOAD_STATUS_TONE = {
    draft: 'muted',
    live: 'primary',
    closed: 'info',
    expired: 'warning',
    awarded: 'info',
    accepted: 'success',
    in_execution: 'success',
    completed: 'success',
    cancelled: 'danger',
};

// Must match LOAD_MANAGER_ROLES in the backend. Other roles see everything read-only.
export const LOAD_MANAGER_ROLES = ['admin', 'co-admin', 'bid_manager'];

export const PRICE_BASIS_LABELS = {
    per_vehicle: 'Per truck',
    per_ton: 'Per ton',
    per_km: 'Per km',
};

export const MARGIN_TYPE_LABELS = { percent: '% of base', fixed: '₹ fixed' };

export const PACKAGING_LABELS = {
    bags: 'Bags',
    pallets: 'Pallets',
    loose: 'Loose',
    coils: 'Coils',
    drums: 'Drums',
    boxes: 'Boxes',
    other: 'Other',
};

export const LOAD_TYPE_LABELS = { FTL: 'Full truck load', PTL: 'Part load' };

export const SPECIAL_REQUIREMENT_LABELS = {
    fragile: 'Fragile',
    hazmat: 'Hazardous',
    temperature_controlled: 'Temperature controlled',
    tarpaulin: 'Tarpaulin cover',
    odc_permit: 'ODC permit',
    loading_labour: 'Loading labour',
    unloading_labour: 'Unloading labour',
    escort: 'Escort',
};

// Quick picks for "bidding closes in", in hours. Default 12 (client question Q3).
export const QUICK_WINDOWS_HOURS = [2, 6, 12, 24];
export const DEFAULT_WINDOW_HOURS = 12;
export const MAX_ATTEMPTS = 5;

export const WIZARD_STEPS = [
    { n: 1, title: 'Route and schedule' },
    { n: 2, title: 'Material and truck' },
    { n: 3, title: 'Price and bid rules' },
    { n: 4, title: 'Invite transporters' },
    { n: 5, title: 'Review and publish' },
];
