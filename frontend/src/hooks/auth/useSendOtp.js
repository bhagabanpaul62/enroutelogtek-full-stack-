import { sendOtpApi } from '@/axios/auth.api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';


export function useSendOtp() {
    const router = useRouter();
    const [apiError, setApiError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    const onSubmit = async (data) => {
        setApiError('');
        try {
            await sendOtpApi(data.email);
            toast.success("Otp send success full")
            router.push('/verify-otp');
        } catch (error) {
            setApiError(error.response?.data?.message || 'Failed to send OTP');
            toast.error(error.response?.data?.message || 'Failed to send OTP');
        }
    };
    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        onSubmit,
        apiError,
    };
}
