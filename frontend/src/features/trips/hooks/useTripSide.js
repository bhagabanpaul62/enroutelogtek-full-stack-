'use client';

import { useSelector } from 'react-redux';
import { dashboardPath } from '@/shared/lib/companyType';

/** { side: 'customer'|'executor', base: '/customer', companyId, user, can(permission) } for the signed-in user. */
export function useTripSide() {
    const user = useSelector((state) => state.auth.user);
    const permissions = user?.permissions;
    const can = (key) => Array.isArray(permissions) && permissions.includes(key);
    return {
        side: user?.companyType === 'customer' ? 'customer' : 'executor',
        base: dashboardPath(user?.companyType),
        companyId: user?.companyId,
        user,
        can,
    };
}
