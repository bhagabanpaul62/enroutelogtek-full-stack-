import api from '@/shared/api/axios';

// Lists - all cursor-paginated. params: { status, companyType, search, cursor, limit }
export const getNetworkApi = (params) => {
    return api.get('/network', { params });
};

export const discoverCompaniesApi = (params) => {
    return api.get('/network/discover', { params });
};

export const getIncomingRequestsApi = (params) => {
    return api.get('/network/requests/incoming', { params });
};

export const getOutgoingRequestsApi = (params) => {
    return api.get('/network/requests/outgoing', { params });
};

// Requests
export const sendRequestApi = (companyId) => {
    return api.post('/network/requests', { companyId });
};

export const acceptRequestApi = (requestId) => {
    return api.patch(`/network/requests/${requestId}/accept`);
};

export const rejectRequestApi = (requestId) => {
    return api.patch(`/network/requests/${requestId}/reject`);
};

export const cancelRequestApi = (requestId) => {
    return api.delete(`/network/requests/${requestId}`);
};

// Connections
export const removeConnectionApi = (connectionId) => {
    return api.delete(`/network/${connectionId}`);
};

export const blockCompanyApi = (connectionId) => {
    return api.patch(`/network/${connectionId}/block`);
};

export const unblockCompanyApi = (connectionId) => {
    return api.patch(`/network/${connectionId}/unblock`);
};
