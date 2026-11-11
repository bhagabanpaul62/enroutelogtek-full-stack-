import api from '@/shared/api/axios';

// Roles and the permissions a role in this company can hold.
export const getPermissionsApi = () => api.get('/team/permissions');
export const getRolesApi = () => api.get('/team/roles');
export const createRoleApi = (data) => api.post('/team/roles', data);
export const updateRoleApi = (roleId, data) => api.patch(`/team/roles/${roleId}`, data);
export const deleteRoleApi = (roleId) => api.delete(`/team/roles/${roleId}`);

// Members - the list is cursor-paginated. params: { search, status, roleId, cursor, limit }
export const getMembersApi = (params) => api.get('/team/members', { params });
export const addMemberApi = (data) => api.post('/team/members', data);
export const updateMemberApi = (userId, data) => api.patch(`/team/members/${userId}`, data);
export const deactivateMemberApi = (userId) => api.post(`/team/members/${userId}/deactivate`);
export const reactivateMemberApi = (userId) => api.post(`/team/members/${userId}/reactivate`);
export const resetMemberPasswordApi = (userId, temporaryPassword) =>
    api.post(`/team/members/${userId}/reset-password`, { temporaryPassword });
