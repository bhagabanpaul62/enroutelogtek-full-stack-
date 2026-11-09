import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { loginUserAction } from '../state/authAction';
import { homePath } from '@/shared/lib/companyType';

/**
 * Login form state and submit handler. On success sends the user to their home page (see homePath).
 */
export function useLogin() {
    const [apiError, setApiError] = useState();
    const router = useRouter();
    const dispatch = useDispatch();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    const onSubmit = async (data) => {
        setApiError('');
        try {
            const res = await dispatch(loginUserAction(data)).unwrap();
            router.push(homePath(res));
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
        onSubmit,
    };
}
