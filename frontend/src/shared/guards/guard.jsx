'use client';
import { checkAuthAction } from '@/features/auth/state/authAction';
import { useRouter } from 'next/navigation';

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import DashboardLoadingScreen from '../ui/primitives/DashboardLoadingScreen';

export default function AuthGuard({ children }) {
    const { isLoggedIn, isLoading } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const router = useRouter();

    useEffect(() => {
        dispatch(checkAuthAction());
    }, [dispatch]);

    useEffect(() => {
        if (!isLoading && !isLoggedIn) {
            router.replace('/login');
        }
    }, [isLoading, isLoggedIn, router]);

    if (isLoading) return <DashboardLoadingScreen/>;
    if (!isLoggedIn) return null;

    return <>{children}</>;
}
