'use client';

import { useEffect, useState } from 'react';
import { getPermissionsApi, getRolesApi } from '../api/team.api';

const errorMessage = (error) =>
    error.response?.data?.message || 'Could not load the roles. Please try again.';

/**
 * The company's roles (with member counts and what the viewer may do with each) and the
 * permissions a role can hold. Only call it for people allowed to read roles.
 * @returns {{ roles: object[], permissions: object[], error: string, isLoading: boolean, reload: () => void }}
 */
export function useRoles() {
    const [reloadCount, setReloadCount] = useState(0);
    // `key` says which load the stored answer belongs to, so a reload shows as loading.
    const [state, setState] = useState({ key: null, roles: [], permissions: [], error: '' });

    useEffect(() => {
        let ignore = false;
        Promise.all([getRolesApi(), getPermissionsApi()])
            .then(([roles, permissions]) => {
                if (!ignore) {
                    setState({ key: reloadCount, roles: roles.data.data, permissions: permissions.data.data, error: '' });
                }
            })
            .catch((error) => {
                if (!ignore) setState((prev) => ({ ...prev, key: reloadCount, error: errorMessage(error) }));
            });
        return () => {
            ignore = true;
        };
    }, [reloadCount]);

    return {
        roles: state.roles,
        permissions: state.permissions,
        error: state.error,
        // The first load shows as loading; later reloads keep the old list on screen.
        isLoading: state.key === null,
        reload: () => setReloadCount((count) => count + 1),
    };
}
