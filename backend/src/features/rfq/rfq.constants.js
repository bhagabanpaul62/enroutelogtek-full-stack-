/**
 * Business settings for contract RFQs (spec 2026-11-18-contract-rfq-design.md, section 1).
 * Values marked "mine" in the spec are not in the PRD and wait for the client to confirm.
 */
import { DEFAULTS } from '#features/load/load.constants.js';

export const RFQ_LIMITS = {
    minWindowMinutes: 60,
    maxWindowDays: 30,
    maxExtensions: 3,
    maxLanes: 200,
    maxRevisions: 10, // quote revisions per lane per transporter (the first quote counts as revision 1)
    maxImportBytes: 200 * 1024,
    maxImportRows: 200,
    maxRatePaise: 1_000_000_000, // Rs 1 crore
    maxMonthlyTrucks: 10000,
};

export const ACCEPTANCE_HOURS = DEFAULTS.acceptanceHours;
export const CLOSING_SOON_MINUTES = DEFAULTS.closingSoonMinutes;
export const RFQ_CLOCK_INTERVAL_MS = DEFAULTS.clockIntervalMs;

export const RFQ_NUMBER_PREFIX = 'RFQ';

// RFQs that can still be cancelled (only while no lane award is accepted).
export const RFQ_CANCELLABLE_FROM = ['draft', 'open', 'closed', 'awarded'];

// CSV import: header -> meaning. Required columns first.
export const IMPORT_REQUIRED_COLUMNS = [
    'origin_pin',
    'origin_city',
    'dest_pin',
    'dest_city',
    'vehicle_type',
    'monthly_volume_trucks',
    'rate_basis',
];
export const IMPORT_OPTIONAL_COLUMNS = ['target_rate_inr', 'notes'];
