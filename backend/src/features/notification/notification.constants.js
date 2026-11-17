/** Email delivery worker settings (ENR-017). */
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const MAX_ATTEMPTS = 5;
/** Wait after failed attempt 1, 2, ... 5. */
export const BACKOFF_MS = [1 * MINUTE, 5 * MINUTE, 30 * MINUTE, 2 * HOUR, 12 * HOUR];
/** A claimed row is hidden this long, so a crashed worker's rows come back. */
export const LEASE_MS = 5 * MINUTE;
export const BATCH_SIZE = 25;
export const WORKER_INTERVAL_MS = 30 * 1000;
export const LAST_ERROR_MAX = 500;
export const SUMMARY_DAYS = 7;
export const DELIVERY_STATUSES = ['pending', 'sent', 'failed'];
export const SYSTEM_ACTOR = 'system';
