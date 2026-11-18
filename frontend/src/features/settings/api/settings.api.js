import api from '@/shared/api/axios';

/** Company settings endpoints (/companies). Stable functions: safe to pass to useCursorList. */
export const settingsApi = {
    getCompany: () => api.get('/companies/me'),
    updateCompany: (data) => api.patch('/companies/me', data),

    // Cursor-paginated. params: { search, status, cursor, limit }
    getBranches: (params) => api.get('/companies/branches', { params }),
    createBranch: (data) => api.post('/companies/branches', data),
    updateBranch: (id, data) => api.patch(`/companies/branches/${id}`, data),
    deactivateBranch: (id, reassignToBranchId) =>
        api.post(`/companies/branches/${id}/deactivate`, reassignToBranchId ? { reassignToBranchId } : {}),
    reactivateBranch: (id) => api.post(`/companies/branches/${id}/reactivate`),

    getDocuments: () => api.get('/companies/documents'),
    // The file goes through the shared upload endpoint; this records it as the current document.
    uploadFile: (file, { userId, companyId, documentType }) => {
        const body = new FormData();
        body.append('file', file);
        body.append('userId', userId ?? '');
        body.append('companyId', companyId ?? '');
        body.append('documentType', documentType);
        return api.post('/documents/upload', body);
    },
    replaceDocument: (documentId, expiresOn) =>
        api.post('/companies/documents/replace', { documentId, ...(expiresOn ? { expiresOn } : {}) }),
};

export const errorText = (error) =>
    error?.response?.data?.message || 'Something went wrong. Please try again.';
