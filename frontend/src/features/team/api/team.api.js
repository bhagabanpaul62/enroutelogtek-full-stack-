import api from '@/shared/api/axios';

/**
 * The team endpoints under one base path. The same screens manage a company's own team
 * ('/team') and, for platform admins, any company's team ('/platform/companies/:id/team').
 * Create it once per base path (module constant or useMemo): list hooks need stable functions.
 * @param {string} basePath
 */
export function createTeamApi(basePath) {
    return {
        // Roles and the permissions a role in this company can hold.
        getPermissions: () => api.get(`${basePath}/permissions`),
        getRoles: () => api.get(`${basePath}/roles`),
        createRole: (data) => api.post(`${basePath}/roles`, data),
        updateRole: (roleId, data) => api.patch(`${basePath}/roles/${roleId}`, data),
        deleteRole: (roleId) => api.delete(`${basePath}/roles/${roleId}`),

        // Members - the list is cursor-paginated. params: { search, status, roleId, cursor, limit }
        getMembers: (params) => api.get(`${basePath}/members`, { params }),
        addMember: (data) => api.post(`${basePath}/members`, data),
        updateMember: (userId, data) => api.patch(`${basePath}/members/${userId}`, data),
        deactivateMember: (userId) => api.post(`${basePath}/members/${userId}/deactivate`),
        reactivateMember: (userId) => api.post(`${basePath}/members/${userId}/reactivate`),
        resetMemberPassword: (userId, temporaryPassword) =>
            api.post(`${basePath}/members/${userId}/reset-password`, { temporaryPassword }),
    };
}

/** The signed-in user's own company team. */
export const companyTeamApi = createTeamApi('/team');

/** One company's team, for platform admins acting as its Owner. */
export const platformTeamApi = (companyId) => createTeamApi(`/platform/companies/${companyId}/team`);
