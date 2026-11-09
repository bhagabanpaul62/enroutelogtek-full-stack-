'use client';

import { useSelector } from 'react-redux';
import { LOAD_MANAGER_ROLES } from '../constants';

/**
 * Whether the signed-in user may change loads (create, publish, award; or bid and accept).
 * The backend enforces the same list; hiding the buttons just avoids a click that would fail.
 */
export function useLoadManager() {
    const role = useSelector((state) => state.auth.user?.role);
    return LOAD_MANAGER_ROLES.includes(role);
}
