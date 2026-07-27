import { verifyOtpApi } from '@/axios/auth.api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export const useVerifyOtp = () => {
    const router = useRouter();
    
    const [apiError, setApiError] = useState();
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    const onSubmit = async (data) => {
        try {
            const res = await verifyOtpApi(data.otp);
            if(res.data.data.userExists) sessionStorage.setItem('userExists', res.data.data.userExists);
            
            toast.success('Otp verified');
            router.push('/register/register-form');
        } catch (error) {
            console.log('use otp error ::', error.response?.data?.message);
            setApiError(error.response?.data?.message);
            toast.error(error.response?.data?.message);
        }
    };

    return {
        control,
        handleSubmit,
        errors,
        isSubmitting,
        apiError,
        onSubmit,
    };
};
