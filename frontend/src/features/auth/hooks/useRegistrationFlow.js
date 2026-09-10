'use client';
import { getRegistrationFlow } from '@/features/auth/api/auth.api';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function useRegistrationFlow() {
    const router = useRouter();
    const pathname = usePathname();

    const [loading, setLoading] = useState(true);
    const [isAllow, setIsAllow] = useState(false);
    useEffect(() => {
        const checkAccess = async () => {
            try {
                const res = await getRegistrationFlow();
                const step = res.data.data.step;
                sessionStorage.setItem('email', res.data.data.email);
                const allowed =
                    (pathname === '/verify-otp' && step === 'OTP_SENT') ||
                    (pathname === '/register/register-form' && step === 'OTP_VERIFIED');

                if (!allowed) {
                    router.replace('/register');
                    return;
                }

                setIsAllow(true);
            } catch {
                router.replace('/register');
            } finally {
                setLoading(false);
            }
        };
        checkAccess();
    }, [pathname]);

    return {
        loading,
        isAllow,
    };
}
