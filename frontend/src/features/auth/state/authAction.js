import { createAsyncThunk } from '@reduxjs/toolkit';
import { aboutMeApi, loginApi } from '../api/auth.api';
import { toast } from 'sonner';

export const loginUserAction = createAsyncThunk('auth/login', async (data, thankAPI) => {
    try {
        const res = await loginApi(data.email, data.password);
        console.log('✅ login api response ::', res.data.data);
        toast.success('user login successful');

        return res.data.data;
    } catch (error) {
        console.log('❌login api error :: ', error.response?.data?.message);

        return thankAPI.rejectWithValue(error.response?.data?.message || 'login failed ');
    }
});

export const checkAuthAction = createAsyncThunk('auth/aboutMe', async (_, thankAPI) => {
    try {
        const res = await aboutMeApi();
        console.log('✅ login api response ::', res.data.data);
        return res.data.data;
    } catch (error) {
        return thankAPI.rejectWithValue(error.response?.data?.message || 'Unauthorize user');
    }
});
