import { PERMISSIONS } from '@/shared/lib/permissions';

// Matches PERMISSIONS.BILLING_MANAGE once shared/lib/permissions.js has it (see NEEDS).
export const BILLING_MANAGE = PERMISSIONS.BILLING_MANAGE ?? 'billing.manage';

/** Shown on step 2 of the pay modal. The app shows no bank details in v1: Enroute shares them. */
export const PAYMENT_INSTRUCTIONS =
    'Pay the amount shown by bank transfer or UPI, using the account details Enroute shared with you. Then upload the receipt or screenshot and enter the reference number.';

export const PURPOSE_LABEL = { new: 'New plan', renewal: 'Renewal', extra_seats: 'Extra seats' };

/** Tones for subscription states and payment statuses (move to kit/tone.js: see NEEDS). */
export const STATE_OPTIONS = [
    { value: 'trial', label: 'Trial', tone: 'info' },
    { value: 'active', label: 'Active', tone: 'success' },
    { value: 'grace', label: 'Grace period', tone: 'warning' },
    { value: 'expired', label: 'Read-only', tone: 'danger' },
    { value: 'cancelled', label: 'Cancelled', tone: 'danger' },
    { value: 'pending_payment', label: 'Payment due', tone: 'warning' },
    { value: 'submitted', label: 'In review', tone: 'warning' },
    { value: 'approved', label: 'Approved', tone: 'success' },
    { value: 'rejected', label: 'Rejected', tone: 'danger' },
];

export const READ_ONLY_STATES = ['expired', 'cancelled', 'pending_payment'];

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const periodLabel = (months) => (months === 12 ? '1 year' : plural(months, 'month'));

/** Where the Billing tab lives for this session user. */
export const billingHref = (basePath) => `${basePath}/settings?tab=billing`;

/** Tells every mounted billing view (banner, tab) to refetch the status. */
export const BILLING_CHANGED = 'billing:changed';
export const notifyBillingChanged = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(BILLING_CHANGED));
};
