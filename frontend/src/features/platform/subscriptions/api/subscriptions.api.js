import api from '@/shared/api/axios';

// Platform admin only (the backend enforces root_admin under /platform). Money is paise.

// All plans with the count of companies on each. params: { includeInactive }
export const listPlansApi = (params) => api.get('/platform/plans', { params });
export const createPlanApi = (data) => api.post('/platform/plans', data);
export const updatePlanApi = (planId, data) => api.patch(`/platform/plans/${planId}`, data);

// Cursor-paginated. params: { status, companyId, cursor, limit }
export const listPaymentsApi = (params) => api.get('/platform/payments', { params });
// The submission, the company's current subscription, its last events, and effectPreview (one line).
export const getPaymentApi = (id) => api.get(`/platform/payments/${id}`);
export const approvePaymentApi = (id, note) => api.post(`/platform/payments/${id}/approve`, note ? { note } : {});
export const rejectPaymentApi = (id, reason) => api.post(`/platform/payments/${id}/reject`, { reason });

// Email outbox. summary: { pending, sent, failed, oldestPendingAt }
export const getDeliverySummaryApi = () => api.get('/platform/notifications/deliveries/summary');
export const listDeliveriesApi = (params) => api.get('/platform/notifications/deliveries', { params });
export const retryDeliveryApi = (id) => api.post(`/platform/notifications/deliveries/${id}/retry`);

// Every company's subscription. params: { state, search, cursor, limit }
export const listSubscriptionsApi = (params) => api.get('/platform/subscriptions', { params });
// Cancel is immediate and logged; a later approved payment reactivates the company.
export const cancelSubscriptionApi = (companyId, reason) => api.post(`/platform/subscriptions/${companyId}/cancel`, { reason });
