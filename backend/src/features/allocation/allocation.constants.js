/** Allocation settings (spec 2026-11-18-allocation-broker-design.md). */
export const RESPOND_BY_HOURS = 24;
export const MAX_RESPOND_BY_HOURS = 72;
export const MAX_DEPTH = 2;
export const MAX_NOTE = 300;
export const MAX_RATE_PAISE = 1_000_000_000; // Rs 1 crore per truck
export const ALLOCATION_CLOCK_INTERVAL_MS = 60 * 1000;
export const DEFAULT_PAGE_LIMIT = 20;

// Who an offerer may offer to, by level (rule 1).
export const RECIPIENT_TYPES = Object.freeze({ 1: ['fleet_owner', 'broker'], 2: ['fleet_owner'] });
