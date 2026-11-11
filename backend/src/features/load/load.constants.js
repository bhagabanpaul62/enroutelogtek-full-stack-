/**
 * Business settings for Ad Hoc loads. Everything a client decision could change lives here,
 * so changing a default never means hunting through the services.
 * The "waiting on the client" answers in tickets/adhoc-load.md map to DEFAULTS below.
 */

export const LOAD_KINDS = ['ad_hoc', 'contract'];

// draft → live → closed → awarded → accepted → in_execution → completed
// live → cancelled, closed/expired → cancelled (before an award), closed → expired (no bids)
export const LOAD_STATUSES = [
    'draft',
    'live',
    'closed',
    'expired',
    'awarded',
    'accepted',
    'in_execution',
    'completed',
    'cancelled',
];

export const PRICE_BASES = ['per_vehicle', 'per_ton', 'per_km'];
export const MARGIN_TYPES = ['percent', 'fixed'];
export const AWARD_STATUSES = ['pending', 'accepted', 'declined', 'expired'];
export const LOAD_TYPES = ['FTL', 'PTL'];
export const PACKAGING_TYPES = ['bags', 'pallets', 'loose', 'coils', 'drums', 'boxes', 'other'];
export const SPECIAL_REQUIREMENT_TAGS = [
    'fragile',
    'hazmat',
    'temperature_controlled',
    'tarpaulin',
    'odc_permit',
    'loading_labour',
    'unloading_labour',
    'escort',
];

export const DEFAULTS = {
    maxAttempts: 5, // bids per transporter per load (product rule)
    bidWindowHours: 12, // client question Q3
    acceptanceHours: 24, // client question Q7
    minPickupLeadHours: 2, // pickup must be at least this far ahead at publish
    closingSoonMinutes: 60, // "closing soon" notification lead time
    clockIntervalMs: 30 * 1000, // how often the clock job looks for windows to close
};

export const QUICK_WINDOWS_HOURS = [2, 6, 12, 24];

export const LOAD_NUMBER_PREFIX = { ad_hoc: 'AH', contract: 'CT' };

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

// Statuses from which each customer action is allowed.
export const CANCELLABLE_FROM = ['draft', 'live', 'closed', 'expired'];
export const EXTENDABLE_FROM = ['live', 'expired'];
export const AWARDABLE_FROM = ['closed'];
export const EDITABLE_FROM = ['draft'];
