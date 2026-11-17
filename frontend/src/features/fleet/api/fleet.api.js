import api from '@/shared/api/axios';

// Module-level so they are stable references for useCursorList. Contract: docs/superpowers/specs/2026-11-17-adhoc-execution-design.md section 4.

export const listVehiclesApi = (params) => api.get('/fleet/vehicles', { params });
export const getVehicleApi = (id) => api.get(`/fleet/vehicles/${id}`);
export const createVehicleApi = (body) => api.post('/fleet/vehicles', body);
export const updateVehicleApi = (id, body) => api.patch(`/fleet/vehicles/${id}`, body);
export const deleteVehicleApi = (id) => api.delete(`/fleet/vehicles/${id}`);
export const addVehicleDocumentApi = (id, body) => api.post(`/fleet/vehicles/${id}/documents`, body);

export const listDriversApi = (params) => api.get('/fleet/drivers', { params });
export const getDriverApi = (id) => api.get(`/fleet/drivers/${id}`);
export const createDriverApi = (body) => api.post('/fleet/drivers', body);
export const updateDriverApi = (id, body) => api.patch(`/fleet/drivers/${id}`, body);
export const deleteDriverApi = (id) => api.delete(`/fleet/drivers/${id}`);
export const addDriverDocumentApi = (id, body) => api.post(`/fleet/drivers/${id}/documents`, body);

export const getVehicleTypesApi = () => api.get('/masters/vehicle-types');
// The spec has no vehicleId/driverId filter on /trips yet; the Trips tab filters the executor's trips by registration / driver name.
export const listTripsApi = (params) => api.get('/trips', { params });
export const uploadFileApi = (body) => api.post('/documents/upload', body);
