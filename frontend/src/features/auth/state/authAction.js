import { createAsyncThunk } from '@reduxjs/toolkit';
import { aboutMeApi, logOutApi, loginApi } from '../api/auth.api';

// The API puts its human-readable reason in data.message; fall back to a fixed line when it has none.
const messageOf = (error, fallback) => error.response?.data?.message || fallback;

/**
 * Logs in with email and password. Resolves with the session user the API returns
 * (userId, name, email, role, companyId, companyType, companyName); rejects with the API message.
 */
export const loginUserAction = createAsyncThunk('auth/login', async (data, thunkAPI) => {
    try {
        const res = await loginApi(data.email, data.password);
        return res.data.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(messageOf(error, 'Login failed'));
    }
});

/** Restores the session from the HttpOnly cookie. Resolves with the same user shape as login. */
export const checkAuthAction = createAsyncThunk('auth/aboutMe', async (_, thunkAPI) => {
    try {
        const res = await aboutMeApi();
        return res.data.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(messageOf(error, 'Not signed in'));
    }
});

/**
 * Ends the server session and clears the cookie. Rejects with the API message when the server
 * could not end it, in which case the store keeps the user so the UI can say so.
 */
export const logoutUserAction = createAsyncThunk('auth/logout', async (_, thunkAPI) => {
    try {
        await logOutApi();
        return null;
    } catch (error) {
        return thunkAPI.rejectWithValue(messageOf(error, 'Could not sign out'));
    }
});
