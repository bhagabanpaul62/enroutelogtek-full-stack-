import { verifyOtpApi } from '@/features/auth/api/auth.api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export const useVerifyOtp = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');

    const [apiError, setApiError] = useState();
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    useEffect(() => {
        setEmail(sessionStorage.getItem('email'));
    }, []);

    const onSubmit = async (data) => {
        try {
            const res = await verifyOtpApi(data.otp);
            if (res.data.data.userExaists) {
                
                toast.success('user already exist try to login ');
                router.push('/login');
            } else {
                toast.success('Otp verified');
                router.push('/register/register-form');
            }
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
        email,
    };
};
