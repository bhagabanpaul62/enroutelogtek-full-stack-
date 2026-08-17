import { sendOtpApi } from '@/features/auth/api/auth.api';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export function useSendOtp() {

    
    
    const router = useRouter();
    const [apiError, setApiError] = useState('');
    const pathName =  usePathname()

    
    
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    const onSubmit = async (data) => {
    
        setApiError('');
        try {
            if(pathName === '/forgot-password') {
                await sendOtpApi(data.email);
                sessionStorage.setItem('email',data.email)
                toast.success('Otp send success full');
                router.push('/forgot-password/reset-password');
            }
            else if (pathName === '/register') {
                await sendOtpApi(data.email);
                toast.success('Otp send success full');
                router.push('/verify-otp');
            }
            
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
