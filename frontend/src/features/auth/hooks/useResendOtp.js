import { sendOtpApi } from '@/features/auth/api/auth.api';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSessionStorageItem } from '@/shared/hooks/useSessionStorageItem';

export const useResendOtp = () => {
    const [count, setCount] = useState(0);
    const email = useSessionStorageItem('email');
    

    const handelResendOtp = async () => {
        try {
            await sendOtpApi(email);
           
            
            setCount(30);
            toast.success('otp send');
        } catch (error) {
            toast.error(error.response?.data?.message);
            
        }
    };

    useEffect(() => {
        if (count <= 0) return;
        const timer = setTimeout(() => {
            setCount((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [count]);

    return {
        handelResendOtp,
        count,
        email,
    };
};
