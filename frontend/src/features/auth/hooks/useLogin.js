'use Client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { checkAuthAction, loginUserAction } from '../state/authAction';
import { useDispatch } from 'react-redux';
import { dashboardPath } from '@/shared/lib/companyType';

export function useLogin() {
    const [apiError, setApiError] = useState();
    const router = useRouter();
    const dispatch = useDispatch();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();

    // useEffect(() => {
    //     (async () => {
    //         try {
    //             const userData = await dispatch(checkAuthAction()).unwrap();

    //             if (userData.role === 'root_admin') {
    //                 router.push('/rootAdmin');
    //             } else {
    //                 router.push(`/${userData.companyType}`);
    //             }
    //         } catch (error) {
    //             console.log(error.response?.data?.message);
    //         }
    //     })();
    // }, []);

    const onSubmit = async (data) => {
        setApiError('');
        try {
            const res = await dispatch(loginUserAction(data)).unwrap();
            console.log('after login our data is  :: ', res);
            if (res.role === 'root_admin') {
                router.push('/rootAdmin');
            } else {
                router.push(dashboardPath(res.companyType));
            }
        } catch (error) {
            // unwrap() throws the thunk's rejectWithValue payload: the API message as a string
            setApiError(typeof error === 'string' ? error : error?.message || 'Something went wrong');

            console.log('in side set api error ', apiError);
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
