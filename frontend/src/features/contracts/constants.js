// Screen text and paths for contracts. Status colours live in kit/tone.js, not here.

export const SIDES = {
    customer: { contracts: '/customer/contracts', load: (id) => `/customer/loads/${id}`, counterpart: 'transporter' },
    transporter: { contracts: '/transporter/contracts', load: (id) => `/transporter/bids/${id}`, counterpart: 'customer' },
};

export const CONTRACT_TABS = [
    { id: 'active', label: 'Active', status: 'active' },
    { id: 'amending', label: 'Amending', status: 'amending' },
    { id: 'expired', label: 'Expired', status: 'expired' },
    { id: 'cancelled', label: 'Cancelled', status: 'cancelled' },
];

export const RATE_UNIT = { per_vehicle: 'truck', per_ton: 'ton', per_kg: 'kg' };

export const MIN_NOTICE_DAYS = 7;
export const MAX_TRUCKS = 50;

// Audit event types from contract_events, in the words a dispatcher would use.
export const EVENT_LABELS = {
    contract_created: 'Contract created from the RFQ award',
    indent_requested: 'Indent requested',
    indent_acknowledged: 'Indent acknowledged, load created',
    indent_declined: 'Indent declined',
    indent_cancelled: 'Indent cancelled',
    indent_fulfilled: 'Indent fulfilled',
    amendment_proposed: 'Amendment proposed',
    amendment_accepted: 'Amendment accepted, new version',
    amendment_rejected: 'Amendment rejected',
    amendment_withdrawn: 'Amendment withdrawn',
    cancelled: 'Contract cancelled',
    expired: 'Contract expired',
};

// Permission keys (backend team.permissions.js). Shared permissions.js is owned elsewhere.
export const PERM = { manage: 'contracts.manage', respond: 'contracts.respond' };
