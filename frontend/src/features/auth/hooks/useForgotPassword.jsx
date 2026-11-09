'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSessionStorageItem } from '@/shared/hooks/useSessionStorageItem';
import { set, useForm } from 'react-hook-form';
import { forgetPasswordApi } from '../api/auth.api';
import { toast } from 'sonner';

export const useForgetPassword = () => {
    const email = useSessionStorageItem('email');
    const [userNotExist, setUserNotExist] = useState(false);
    const [apiError, setApiError] = useState();
    const router = useRouter();
    const {
        register,
        handleSubmit,
        control,
        setError,
        formState: { errors, isSubmitting },
    } = useForm();

    const onSubmit = async (data) => {
        try {
            // const res = await forgetPasswordApi(data);

            // match password
            if (data.confirmPassword !== data.password) {
                setError('confirmPassword', {
                    type: 'manual',
                    message: 'Passwords do not match',
                });
                return;
            }
            const payload = { otp: data.otp, newPassword: data.password };
            const res = await forgetPasswordApi(payload);
            toast.success('forget password successful');
            router.replace('/login')
            
        } catch (error) {
            const errorMessage = error.response?.data?.message;
            setApiError(errorMessage);
            toast.error(errorMessage);
            
            const rest = error.response?.status === 404
            setUserNotExist(rest)
            
          
        }
    };

    return {
        control,
        register,
        handleSubmit,
        onSubmit,
        email,
        errors,
        apiError,
        userNotExist,
    };
};
