import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { apiReason, resendLoginOtpApi } from '../api/auth.api';
import { verifyLoginOtpAction } from '../state/authAction';
import { homePath } from '@/shared/lib/companyType';
import { LOGIN_EMAIL_KEY, LOGIN_RESTART } from '@/shared/lib/authStorage';
import { useSessionStorageItem } from '@/shared/hooks/useSessionStorageItem';

// Matches the API's resend cooldown; the API stays the judge if the two ever differ.
const RESEND_WAIT_SECONDS = 30;

/**
 * Code step of the login: the form, the resend countdown and the outcome. `mustRestart` turns
 * true when the API says the pending login is over (expired, used, too many wrong codes), so the
 * page offers the way back to the password step instead of another try.
 */
export function useLoginOtp() {
    const router = useRouter();
    const dispatch = useDispatch();
    const email = useSessionStorageItem(LOGIN_EMAIL_KEY);
    const [apiError, setApiError] = useState('');
    const [mustRestart, setMustRestart] = useState(false);
    const [count, setCount] = useState(RESEND_WAIT_SECONDS);
    const [resending, setResending] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    useEffect(() => {
        if (count <= 0) return undefined;
        const timer = setTimeout(() => setCount((prev) => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [count]);

    const showFailure = (reason) => {
        setApiError(reason.message);
        setMustRestart(reason.code === LOGIN_RESTART);
    };

    const onSubmit = async ({ otp }) => {
        setApiError('');
        try {
            const user = await dispatch(verifyLoginOtpAction(otp)).unwrap();
            sessionStorage.removeItem(LOGIN_EMAIL_KEY);
            router.replace(homePath(user));
        } catch (reason) {
            showFailure(reason ?? { message: 'Something went wrong' });
        }
    };

    const resend = async () => {
        setApiError('');
        setResending(true);
        try {
            const res = await resendLoginOtpApi();
            setCount(res.data.data?.resendInSeconds || RESEND_WAIT_SECONDS);
            toast.success('A new code is on its way');
        } catch (error) {
            showFailure(apiReason(error, 'Could not send a new code'));
        } finally {
            setResending(false);
        }
    };

    return {
        control,
        handleSubmit,
        errors,
        isSubmitting,
        apiError,
        mustRestart,
        onSubmit,
        email,
        count,
        resend,
        resending,
    };
}
