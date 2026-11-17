import api from '@/shared/api/axios';

/** Company billing endpoints (/billing). Stable functions: safe to pass to useCursorList / useAsyncData. */
export const billingApi = {
    getStatus: () => api.get('/billing/status'),
    getPlans: () => api.get('/billing/plans'),
    // params: { purpose, planId, periodMonths, extraSeats }
    getQuote: (params) => api.get('/billing/quote', { params }),
    createSubmission: (data) => api.post('/billing/submissions', data),
    // Cursor-paginated. params: { status, cursor, limit }
    getSubmissions: (params) => api.get('/billing/submissions', { params }),
    getSeatChanges: (params) => api.get('/billing/seat-changes', { params }),
    // The proof goes through the shared upload endpoint; the answer holds { documentId }.
    uploadProof: (file, { userId, companyId }) => {
        const body = new FormData();
        body.append('file', file);
        body.append('userId', userId ?? '');
        body.append('companyId', companyId ?? '');
        body.append('documentType', 'paymentProof');
        return api.post('/documents/upload', body);
    },
};

export const errorCode = (error) => error?.response?.data?.error?.code;

const MESSAGES = {
    SUBMISSION_OPEN: 'A payment is already waiting for review. You can send another once it is reviewed.',
    PURPOSE_NOT_ALLOWED: 'That is not available for your plan right now. Reload the page and try again.',
    PLAN_INACTIVE: 'That plan is no longer offered. Pick another plan.',
    PERIOD_NOT_OFFERED: 'That period is not offered for this plan. Pick another.',
    PROOF_INVALID: 'The proof file was not accepted. Upload it again.',
    SUBSCRIPTION_NOT_ACTIVE: 'Your plan is not active, so seats cannot be added. Renew instead.',
};

export const billingErrorText = (error) =>
    MESSAGES[errorCode(error)] || error?.response?.data?.message || 'Something went wrong. Please try again.';
