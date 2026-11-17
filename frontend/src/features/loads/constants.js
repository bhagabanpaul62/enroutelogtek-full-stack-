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

export const PRICE_BASIS_LABELS = {
    per_vehicle: 'Per truck',
    per_ton: 'Per ton',
    per_km: 'Per km',
    per_kg: 'Per kg',
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
export const LOAD_TYPE_SHORT = { FTL: 'FTL', PTL: 'PTL' };

// Wave 2 (AJ-05..13). Values match backend/src/features/load/load.constants.js.
export const PLACE_KIND_LABELS = { door: 'Door', godown: 'Godown' };
export const HANDLING_LABELS = { manual: 'Manual', forklift: 'Forklift', crane: 'Crane', none: 'None needed' };
export const PAYABLE_BY_LABELS = { consignor: 'Consignor (shipper)', consignee: 'Consignee', transporter: 'Transporter' };
export const HAZMAT_CLASS_LABELS = {
    1: '1 Explosives',
    2: '2 Gases',
    3: '3 Flammable liquids',
    4: '4 Flammable solids',
    5: '5 Oxidisers',
    6: '6 Toxic',
    7: '7 Radioactive',
    8: '8 Corrosives',
    9: '9 Miscellaneous',
};

// PRD section 4 (Q-10, Q-19, Q-20). The server recomputes everything; these only drive the live preview and the prefill.
export const PTL_DEFAULTS = { volumetricDivisor: 5000, minChargeableKg: 50 };
export const TERMS_DEFAULTS = {
    freeTimeLoadingHours: 24,
    freeTimeUnloadingHours: 24,
    detentionRatePerHour: 0, // rupees (the API stores paise)
    labourPayableBy: 'consignor',
    freightPayableBy: 'consignor',
    tollIncluded: true,
};

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
