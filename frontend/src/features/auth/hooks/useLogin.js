'use Client';

import { loginApi } from '@/features/auth/api/auth.api';
import useAuthStore from '@/features/auth/state/auth.store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export function useLogin() {
    const [apiError, setApiError] = useState();
    const route = useRouter();
    const { setUser } = useAuthStore();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    const onSubmit = async (data) => {
        setApiError('');
        try {
            const res = await loginApi(data.email, data.password);

            setUser(res.data.data);
            console.log(res.data.data);
        } catch (error) {
            setApiError(error.response?.data?.message || 'Something went wrong');
            toast.error('invalid user');
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
