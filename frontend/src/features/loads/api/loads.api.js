import api from '@/shared/api/axios';

// Functions are module-level so they are stable references for useCursorList.

// ----- masters -----
export const getVehicleTypesApi = () => api.get('/masters/vehicle-types');
export const getCommoditiesApi = () => api.get('/masters/commodities');
export const lookupPinCodeApi = (pinCode) => api.get(`/masters/pin-codes/${pinCode}`);

// ----- loads, both sides (the backend shapes the answer by company type) -----
// params: { status, search, cursor, limit }
export const getLoadsApi = (params) => api.get('/loads', { params });
export const getLoadApi = (loadId) => api.get(`/loads/${loadId}`);

// ----- customer -----
export const getInviteesApi = (params) => api.get('/loads/invitees', { params });
export const createLoadApi = (fields = {}) => api.post('/loads', fields);
export const updateLoadApi = (loadId, fields) => api.patch(`/loads/${loadId}`, fields);
export const publishLoadApi = (loadId) => api.post(`/loads/${loadId}/publish`);
export const extendLoadApi = (loadId, closesAt) => api.post(`/loads/${loadId}/extend`, { closesAt });
export const cancelLoadApi = (loadId, reason) => api.post(`/loads/${loadId}/cancel`, { reason });
export const completeLoadApi = (loadId) => api.post(`/loads/${loadId}/complete`);
export const getLoadBidsApi = (loadId) => api.get(`/loads/${loadId}/bids`);
export const awardLoadApi = (loadId, bidId, reason) =>
    api.post(`/loads/${loadId}/award`, { bidId, reason });

// ----- transporter -----
export const submitBidApi = (loadId, { baseRate, marginType, marginValue }) =>
    api.post(`/loads/${loadId}/bids`, { baseRate, marginType, marginValue });
export const getMyBidApi = (loadId) => api.get(`/loads/${loadId}/my-bid`);
export const acceptAwardApi = (awardId) => api.post(`/awards/${awardId}/accept`);
export const declineAwardApi = (awardId) => api.post(`/awards/${awardId}/decline`);
export const assignVehicleApi = (awardId, { vehicleNumber, driverName, driverPhone }) =>
    api.patch(`/awards/${awardId}/assignment`, { vehicleNumber, driverName, driverPhone });
