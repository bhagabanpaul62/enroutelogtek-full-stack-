import { createAsyncThunk } from '@reduxjs/toolkit';
import { aboutMeApi, apiReason, logOutApi, loginApi, verifyLoginOtpApi } from '../api/auth.api';

// The API puts its human-readable reason in data.message; fall back to a fixed line when it has none.
const messageOf = (error, fallback) => error.response?.data?.message || fallback;

/**
 * Login step 1: email and password. Does not sign anyone in: resolves with the pending login
 * `{ step: 'OTP_REQUIRED', email, expiresInSeconds, resendInSeconds, resendsLeft }` once the code
 * is emailed. Rejects with the API message.
 */
export const loginUserAction = createAsyncThunk('auth/login', async (data, thunkAPI) => {
    try {
        const res = await loginApi(data.email, data.password);
        return res.data.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(messageOf(error, 'Login failed'));
    }
});

/**
 * Login step 2: the emailed code. Resolves with the session user (userId, name, email, role,
 * companyId, companyType, companyName). Rejects with `{ message, code }`; code LOGIN_RESTART
 * means the pending login is over and the person must enter their password again.
 */
export const verifyLoginOtpAction = createAsyncThunk('auth/verifyLoginOtp', async (otp, thunkAPI) => {
    try {
        const res = await verifyLoginOtpApi(otp);
        return res.data.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(apiReason(error, 'Could not check the code'));
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
