// Must match backend/src/features/subscription/subscription.constants.js
export const PERIOD_OPTIONS = [1, 3, 12];
export const REJECT_REASON_MIN = 3;
export const REJECT_REASON_MAX = 500;

export const PAYMENT_TABS = [
    { id: 'submitted', label: 'Submitted' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
];

export const PURPOSE_LABELS = { new: 'New plan', renewal: 'Renewal', extra_seats: 'Extra seats' };

// 'submitted' is not in the kit's status table yet, so the chips carry their own tone.
export const PAYMENT_STATUS_OPTIONS = [
    { value: 'submitted', label: 'Submitted', tone: 'warning' },
    { value: 'approved', label: 'Approved', tone: 'success' },
    { value: 'rejected', label: 'Rejected', tone: 'danger' },
];

export const periodLabel = (months) => (months === 12 ? '1 year' : `${months} month${months === 1 ? '' : 's'}`);

/** A payment's period. Extra seats run to the end of the current term; their stored months only drive the pro-rating. */
export const paymentPeriod = (p) => (p.purpose === 'extra_seats' ? 'Rest of term' : p.periodMonths ? periodLabel(p.periodMonths) : '');

// Rupees typed in a field to integer paise ('' or junk gives null).
export function rupeesToPaise(text) {
    const value = String(text).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
    return Math.round(Number(value) * 100);
}

export const paiseToRupees = (paise) => (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2));

/**
 * What the amount should be from the price snapshot on the submission, so the admin can see the
 * server's number match the plan's rule. null when the purpose is pro-rated seats or the snapshot is missing.
 */
export function expectedAmount(payment) {
    const snap = payment.priceSnapshot ?? payment.breakdown;
    if (payment.purpose === 'extra_seats' || !snap) return null;
    const monthly = snap.monthlyPricePaise ?? snap.monthlyPrice;
    const extra = snap.extraSeatPricePaise ?? snap.extraSeatPrice;
    if (!Number.isInteger(monthly) || !Number.isInteger(extra)) return null;
    return (monthly + extra * (payment.extraSeats ?? 0)) * payment.periodMonths;
}

// The backend error envelope: { message, error: { code } }.
export const errorCode = (error) => error.response?.data?.error?.code ?? error.response?.data?.code;
export const errorMessage = (error) => error.response?.data?.message || 'Something went wrong. Please try again.';
