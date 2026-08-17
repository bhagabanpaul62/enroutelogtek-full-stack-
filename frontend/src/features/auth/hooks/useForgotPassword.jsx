'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { set, useForm } from 'react-hook-form';
import { forgetPasswordApi } from '../api/auth.api';
import { toast } from 'sonner';

export const useForgetPassword = () => {
    const [email, setEmail] = useState(null);
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

    useEffect(() => {
        setEmail(sessionStorage.getItem('email'));
    }, []);

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
            console.log(errorMessage);
            setApiError(errorMessage);
            toast.error(errorMessage);
            console.log('status code ::', error.response.status);
            
            const rest = error.response.status === 404
            console.log(" status code res :: " ,rest);
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
