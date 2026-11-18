// Defaults the client may change. No price lives here: plans are created by the platform admin.
export const TRIAL_DAYS = 14; // 0 switches the trial off (a new company starts in pending_payment)
export const TRIAL_SEATS = 3;
export const GRACE_DAYS = 7;
export const PERIOD_OPTIONS = Object.freeze([1, 3, 12]);
export const PRORATE_MONTH_DAYS = 30;
export const REMINDER_DAYS = Object.freeze([7, 1]);
export const EXPIRY_CLOCK_MS = 10 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_EXTRA_SEATS = 500;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export const PURPOSE = Object.freeze({ NEW: 'new', RENEWAL: 'renewal', EXTRA_SEATS: 'extra_seats' });
export const STATE = Object.freeze({
    TRIAL: 'trial',
    ACTIVE: 'active',
    GRACE: 'grace',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
    PENDING_PAYMENT: 'pending_payment',
});
export const EVENT = Object.freeze({
    TRIAL_STARTED: 'trial_started',
    SUBMISSION_CREATED: 'submission_created',
    SUBMISSION_APPROVED: 'submission_approved',
    SUBMISSION_REJECTED: 'submission_rejected',
    STATUS_CHANGED: 'status_changed',
    CANCELLED: 'cancelled',
    PLAN_CREATED: 'plan_created',
    PLAN_UPDATED: 'plan_updated',
});
export const SEAT_REASON = Object.freeze({
    TRIAL_STARTED: 'trial_started',
    new: 'plan_approved',
    renewal: 'renewal_approved',
    extra_seats: 'extra_seats_approved',
});
export const CODE = Object.freeze({
    EXPIRED: 'SUBSCRIPTION_EXPIRED',
    SEAT_LIMIT: 'SEAT_LIMIT',
    SUBMISSION_OPEN: 'SUBMISSION_OPEN',
    PURPOSE_NOT_ALLOWED: 'PURPOSE_NOT_ALLOWED',
    ALREADY_REVIEWED: 'ALREADY_REVIEWED',
    NOT_ACTIVE: 'SUBSCRIPTION_NOT_ACTIVE',
    PLAN_INACTIVE: 'PLAN_INACTIVE',
    PERIOD_NOT_OFFERED: 'PERIOD_NOT_OFFERED',
    PROOF_INVALID: 'PROOF_INVALID',
});
