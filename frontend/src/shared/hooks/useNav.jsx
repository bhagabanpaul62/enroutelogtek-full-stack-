'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuthAction } from '@/features/auth/state/authAction';

/**
 * Session state for the public nav: restores the session once on mount so a signed-in visitor
 * sees "Open dashboard" instead of "Log in". A failed check simply leaves them signed out.
 */
export const useNav = () => {
    const dispatch = useDispatch();
    const { user, isLoggedIn } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(checkAuthAction());
    }, [dispatch]);

    return { user, isLoggedIn };
};
