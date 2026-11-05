'use client';

import { useSelector } from 'react-redux';
import { NETWORK_MANAGER_ROLES } from '../constants';

// Only admins and co-admins can change the network. The backend enforces this too -
// hiding the buttons is just so other roles don't click something that will fail.
export function useCanManageNetwork() {
    const role = useSelector((state) => state.auth.user?.role);
    return NETWORK_MANAGER_ROLES.includes(role);
}
