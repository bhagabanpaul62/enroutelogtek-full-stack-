'use client';

import { useSelector } from 'react-redux';

/**
 * Whether the signed-in user's company role holds a permission (see shared/lib/permissions.js).
 * The backend enforces the same check; hiding a button only spares a click that would fail.
 * @param {string} permission one of PERMISSIONS
 * @returns {boolean}
 */
export function useCan(permission) {
    const permissions = useSelector((state) => state.auth.user?.permissions);
    return Array.isArray(permissions) && permissions.includes(permission);
}
