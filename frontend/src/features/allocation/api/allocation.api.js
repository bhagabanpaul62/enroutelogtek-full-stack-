import api from '@/shared/api/axios';

// Contract: docs/superpowers/specs/2026-11-18-allocation-broker-design.md (ALLOC-BACKEND).
// Lists are adapted to the { data: { data: [], pagination: { nextCursor } } } shape useCursorList reads, whichever envelope the API uses.
const body = (res) => res.data?.data ?? res.data;
const asPage = (res) => {
    const b = res.data ?? {};
    const inner = b.data && !Array.isArray(b.data) ? b.data : b;
    const items = Array.isArray(b.data) ? b.data : (inner.items ?? []);
    const nextCursor = inner.nextCursor ?? inner.pagination?.nextCursor ?? b.pagination?.nextCursor ?? null;
    return { data: { data: items, pagination: { nextCursor } } };
};

export const apiMessage = (error, fallback = 'Something went wrong. Please try again.') => error?.response?.data?.message || fallback;

export const getAwardAllocationsApi = (awardId) => api.get(`/allocations/awards/${awardId}`).then(body);
export const listOffersApi = (params) => api.get('/allocations/offers', { params }).then(asPage);
export const listPlacedApi = (params) => api.get('/allocations/placed', { params }).then(asPage);
export const getAllocationApi = (id) => api.get(`/allocations/${id}`).then(body);
export const getPartnersApi = (params) => api.get('/allocations/partners', { params }).then(body);
export const createAllocationApi = (payload) => api.post('/allocations', payload).then(body);
export const withdrawAllocationApi = (id, note) => api.post(`/allocations/${id}/withdraw`, note ? { note } : {}).then(body);
export const acceptAllocationApi = (id) => api.post(`/allocations/${id}/accept`, {}).then(body);
export const declineAllocationApi = (id, reason) => api.post(`/allocations/${id}/decline`, { reason }).then(body);
// Connected companies of one type, for the broker Transporters / Fleet owners pages.
export const listConnectionsApi = (params) => api.get('/network', { params: { status: 'accepted', ...params } });
