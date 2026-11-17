import api from '@/shared/api/axios';

// Module-level so they are stable references for useCursorList.

// The list endpoint may answer { items, nextCursor } (spec) or { data, pagination } (rest of the app).
// useCursorList reads the second shape, so normalise here.
const asList = (response) => {
    const body = response.data?.data && !Array.isArray(response.data.data) ? response.data.data : response.data;
    const items = Array.isArray(body) ? body : body?.items ?? body?.data ?? [];
    const nextCursor = body?.nextCursor ?? body?.pagination?.nextCursor ?? response.data?.pagination?.nextCursor ?? null;
    return { ...response, data: { data: items, pagination: { nextCursor } } };
};
export const unwrap = (response) => response.data?.data ?? response.data;

// params: { status, loadId, role, cursor, limit }
export const getTripsApi = (params) => api.get('/trips', { params }).then(asList);
export const getTripApi = (tripId) => api.get(`/trips/${tripId}`).then(unwrap);

export const assignTripApi = (tripId, body) => api.patch(`/trips/${tripId}/assign`, body).then(unwrap);
export const transitionTripApi = (tripId, body) => api.post(`/trips/${tripId}/transition`, body).then(unwrap);
export const addNoteApi = (tripId, body) => api.post(`/trips/${tripId}/notes`, body).then(unwrap);
export const addTripDocumentApi = (tripId, body) => api.post(`/trips/${tripId}/documents`, body).then(unwrap);
export const proposeChargeApi = (tripId, body) => api.post(`/trips/${tripId}/charges`, body).then(unwrap);
export const decideChargeApi = (tripId, chargeId, body) => api.post(`/trips/${tripId}/charges/${chargeId}/decision`, body).then(unwrap);
export const addDiscrepancyApi = (tripId, body) => api.post(`/trips/${tripId}/discrepancies`, body).then(unwrap);
export const confirmTripApi = (tripId, body) => api.post(`/trips/${tripId}/confirm`, body).then(unwrap);
export const rejectPodApi = (tripId, body) => api.post(`/trips/${tripId}/reject-pod`, body).then(unwrap);
export const cancelTripApi = (tripId, body) => api.post(`/trips/${tripId}/cancel`, body).then(unwrap);
export const placementDecisionApi = (tripId, body) => api.post(`/trips/${tripId}/placement-decision`, body).then(unwrap);
export const rateLoadApi = (loadId, body) => api.post(`/loads/${loadId}/ratings`, body).then(unwrap);
export const getReliabilityApi = (companyId) => api.get(`/transporters/${companyId}/reliability`).then(unwrap);

// Fleet pickers for the assign modal (FLEET-BACKEND).
export const getAvailabilityApi = (params) => api.get('/fleet/availability', { params }).then(unwrap);

// File upload (existing endpoint); resolves to the stored file URL.
export const uploadFileApi = async (file, { documentType, user }) => {
    const body = new FormData();
    body.append('file', file);
    body.append('userId', user?.userId ?? '');
    body.append('companyId', user?.companyId ?? '');
    body.append('documentType', documentType);
    const { data } = await api.post('/documents/upload', body);
    return data.data.fileUrl;
};

export const apiMessage = (error, fallback = 'Something went wrong. Please try again.') => error?.response?.data?.message || fallback;
