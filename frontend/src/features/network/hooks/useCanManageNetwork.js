'use client';

import { useCan } from '@/shared/hooks/useCan';
import { PERMISSIONS } from '@/shared/lib/permissions';

// Roles with network.manage can change the network. The backend enforces this too -
// hiding the buttons is just so other roles don't click something that will fail.
export function useCanManageNetwork() {
    return useCan(PERMISSIONS.NETWORK_MANAGE);
}
