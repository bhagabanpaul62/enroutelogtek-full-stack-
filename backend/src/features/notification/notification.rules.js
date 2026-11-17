/** Pure rules for notification delivery: no database, no mail server. */
import { BACKOFF_MS, LAST_ERROR_MAX, MAX_ATTEMPTS } from './notification.constants.js';

/**
 * When to try again after the `attempts`-th failed send.
 * @param {number} attempts attempts made so far, counting the one that just failed
 * @param {Date} now
 * @returns {Date|null} null when the budget is spent (the row becomes failed)
 */
export const nextAttempt = (attempts, now) => {
    if (!Number.isInteger(attempts) || attempts < 1 || attempts >= MAX_ATTEMPTS) return null;
    return new Date(now.getTime() + BACKOFF_MS[attempts - 1]);
};

/** SMTP 550-554 or a bad address will not get better by retrying. */
export const isPermanentFailure = (error) => {
    const code = Number(error?.responseCode);
    if (code >= 550 && code <= 554) return true;
    if (error?.code === 'EENVELOPE') return true;
    return /invalid (recipient|address)|no recipients defined/i.test(String(error?.message ?? ''));
};

export const trimError = (error) => String(error?.message ?? error ?? 'Unknown error').slice(0, LAST_ERROR_MAX);

/** The two delivery rows written with a notification: in_app is already sent, email waits for the worker. */
export const deliveryRows = (notificationId, email, now) => [
    { notificationId, channel: 'in_app', status: 'sent', sentAt: now, attempts: 0 },
    { notificationId, channel: 'email', status: 'pending', toEmail: email, nextAttemptAt: now, attempts: 0 },
];

/** Keys are stored in varchar(200); empty means no guard. */
export const normalizeDedupeKey = (key) => {
    const value = typeof key === 'string' ? key.trim() : '';
    return value ? value.slice(0, 200) : null;
};

/**
 * What the worker does with a failed send.
 * @returns {{ status: 'pending'|'failed', nextAttemptAt: Date|null, lastError: string }}
 */
export const failureOutcome = (error, attempts, now) => {
    const lastError = trimError(error);
    const retryAt = isPermanentFailure(error) ? null : nextAttempt(attempts, now);
    return retryAt
        ? { status: 'pending', nextAttemptAt: retryAt, lastError }
        : { status: 'failed', nextAttemptAt: null, lastError };
};
