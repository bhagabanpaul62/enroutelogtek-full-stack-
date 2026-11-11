'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { apiReason, changePasswordApi } from '../api/auth.api';
import { checkAuthAction, logoutUserAction } from '../state/authAction';
import { setUser } from '../state/authSlice';
import { homePath } from '@/shared/lib/companyType';

/** Must match PASSWORD_MIN_LENGTH / PASSWORD_MAX_LENGTH in the backend login rules. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

/**
 * The change-password screen: loads the session (signed-out visitors go to login), checks the
 * form, and on success stores the updated user and opens their home page.
 */
export function useChangePassword() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user, isLoading, isLoggedIn } = useSelector((state) => state.auth);
    const [apiError, setApiError] = useState('');

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm();

    useEffect(() => {
        dispatch(checkAuthAction());
    }, [dispatch]);

    useEffect(() => {
        if (!isLoading && !isLoggedIn) router.replace('/login');
    }, [isLoading, isLoggedIn, router]);

    const onSubmit = async ({ currentPassword, newPassword }) => {
        setApiError('');
        try {
            const { data } = await changePasswordApi(currentPassword, newPassword);
            dispatch(setUser(data.data));
            toast.success('Password changed');
            router.replace(homePath(data.data));
        } catch (error) {
            setApiError(apiReason(error, 'Could not change the password').message);
        }
    };

    const signOut = async () => {
        await dispatch(logoutUserAction());
        router.replace('/login');
    };

    return {
        user,
        ready: !isLoading && isLoggedIn,
        register,
        handleSubmit,
        getValues,
        errors,
        isSubmitting,
        apiError,
        onSubmit,
        signOut,
    };
}
