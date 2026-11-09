import api from '@/shared/api/axios';

// All routes need the root_admin role; the backend enforces it for everything under /platform.

// Cursor-paginated. params: { status, search, cursor, limit }
export const listCompaniesApi = (params) => {
    return api.get('/platform/companies', { params });
};

// { pending: 3, approved: 10, ... }
export const getCompanySummaryApi = () => {
    return api.get('/platform/companies/summary');
};

// { company, branches, users, documents, rejections }
export const getCompanyApi = (companyId) => {
    return api.get(`/platform/companies/${companyId}`);
};

// Decisions. Each answers { company, emailSent?, emailError? }.
export const approveCompanyApi = (companyId) => {
    return api.patch(`/platform/companies/${companyId}/approve`);
};

export const rejectCompanyApi = (companyId, reason) => {
    return api.patch(`/platform/companies/${companyId}/reject`, { reason });
};

export const blockCompanyApi = (companyId) => {
    return api.patch(`/platform/companies/${companyId}/block`);
};

export const unblockCompanyApi = (companyId) => {
    return api.patch(`/platform/companies/${companyId}/unblock`);
};
