'use client';
import { checkAuthAction } from '@/features/auth/state/authAction';
import { useRouter } from 'next/navigation';

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import DashboardLoadingScreen from '../ui/primitives/DashboardLoadingScreen';
import { CHANGE_PASSWORD_PATH } from '@/shared/lib/authStorage';

/**
 * Shows the app only to a signed-in user. Signed-out visitors go to the login page; someone
 * with a temporary password from their admin goes to set their own first (the API refuses
 * everything else until they do).
 */
export default function AuthGuard({ children }) {
    const { isLoggedIn, isLoading, user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const router = useRouter();
    const mustChangePassword = Boolean(user?.mustChangePassword);

    useEffect(() => {
        dispatch(checkAuthAction());
    }, [dispatch]);

    useEffect(() => {
        if (isLoading) return;
        if (!isLoggedIn) router.replace('/login');
        else if (mustChangePassword) router.replace(CHANGE_PASSWORD_PATH);
    }, [isLoading, isLoggedIn, mustChangePassword, router]);

    if (isLoading) return <DashboardLoadingScreen/>;
    if (!isLoggedIn || mustChangePassword) return null;

    return <>{children}</>;
}
