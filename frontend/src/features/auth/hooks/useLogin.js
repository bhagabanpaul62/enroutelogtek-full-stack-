import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { loginUserAction } from '../state/authAction';
import { AUTH_NOTICE_KEY, LOGIN_EMAIL_KEY } from '@/shared/lib/authStorage';
import { useSessionStorageItem } from '@/shared/hooks/useSessionStorageItem';

/**
 * Password step of the login. On success the API emails a code and this sends the person to
 * the code screen (/login/verify). `notice` is why this tab was signed out, if it was.
 */
export function useLogin() {
    const [apiError, setApiError] = useState();
    const router = useRouter();
    const dispatch = useDispatch();
    const notice = useSessionStorageItem(AUTH_NOTICE_KEY);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    const onSubmit = async (data) => {
        setApiError('');
        // The sign-out reason has been read; a new attempt should not keep showing it.
        sessionStorage.removeItem(AUTH_NOTICE_KEY);
        try {
            const pending = await dispatch(loginUserAction(data)).unwrap();
            sessionStorage.setItem(LOGIN_EMAIL_KEY, pending.email);
            router.push('/login/verify');
        } catch (error) {
            // unwrap() throws the thunk's rejectWithValue payload: the API message as a string
            setApiError(typeof error === 'string' ? error : error?.message || 'Something went wrong');
        }
    };

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        apiError,
        notice,
        onSubmit,
    };
}
