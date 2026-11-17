import api from '@/shared/api/axios';

// One function per endpoint in spec sections 4.2 and 4.3. Money is paise on the wire.
// Module-level so references are stable for hooks.

export const getContractsApi = (params) => api.get('/contracts', { params });
export const getContractApi = (contractId) => api.get(`/contracts/${contractId}`);
export const getConsumptionApi = (contractId, month) =>
    api.get(`/contracts/${contractId}/consumption`, { params: month ? { month } : {} });
export const getContractEventsApi = (contractId) => api.get(`/contracts/${contractId}/events`);
export const getAmendmentsApi = (contractId) => api.get(`/contracts/${contractId}/amendments`);
export const proposeAmendmentApi = (contractId, body) => api.post(`/contracts/${contractId}/amendments`, body);
export const acceptAmendmentApi = (contractId, id) => api.post(`/contracts/${contractId}/amendments/${id}/accept`);
export const rejectAmendmentApi = (contractId, id, note) =>
    api.post(`/contracts/${contractId}/amendments/${id}/reject`, { note });
export const withdrawAmendmentApi = (contractId, id) => api.post(`/contracts/${contractId}/amendments/${id}/withdraw`);
export const cancelContractApi = (contractId, body) => api.post(`/contracts/${contractId}/cancel`, body);

export const getContractIndentsApi = (contractId, params) => api.get(`/contracts/${contractId}/indents`, { params });
export const createIndentApi = (contractId, body) => api.post(`/contracts/${contractId}/indents`, body);

// Cross-contract indent list: the transporter inbox and the customer's list.
export const getIndentsApi = (params) => api.get('/indents', { params });
export const getIndentApi = (indentId) => api.get(`/indents/${indentId}`);
export const acknowledgeIndentApi = (indentId) => api.post(`/indents/${indentId}/acknowledge`, {});
export const declineIndentApi = (indentId, reason) => api.post(`/indents/${indentId}/decline`, { reason });
export const cancelIndentApi = (indentId, reason) => api.post(`/indents/${indentId}/cancel`, { reason });
