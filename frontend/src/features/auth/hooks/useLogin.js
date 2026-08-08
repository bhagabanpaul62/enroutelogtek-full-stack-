'use Client';

import { loginApi } from '@/features/auth/api/auth.api';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { checkAuthAction, loginUserAction } from '../state/authAction';
import { useDispatch } from 'react-redux';

export function useLogin() {
    const [apiError, setApiError] = useState();
    const route = useRouter();
    const dispatch = useDispatch();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    useEffect(() => {
        (async () => {
            try {
                await dispatch(checkAuthAction()).unwrap();
            } catch (error) {
               console.log(error.response?.data?.message);
            }
        })();
    }, []);

    const onSubmit = async (data) => {
        setApiError('');
        try {
            await dispatch(loginUserAction(data)).unwrap();
        } catch (error) {
            setApiError(error.response?.data?.message || 'Something went wrong');

            console.log('in side set api error ', apiError);
        }
    };
    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        apiError,
        onSubmit,
    };
}
