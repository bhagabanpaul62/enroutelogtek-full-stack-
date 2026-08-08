import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getMeApi } from '../api/auth.api';
import { checkAuthAction, loginUserAction } from './authAction';

// export const checkAuth = createAsyncThunk('auth/checkAuth',async()=>{
//     try {
//         const res = await getMeApi();
//         return res.data.data
//     } catch (error) {

//     }
// })

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isLoggedIn: false,
        isLoading: true,
    },

    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
            state.isLoggedIn = true;
            state.isLoading = false;
        },
        removeUser: (state, action) => {
            state.user = null;
            state.isLoading = false;
            state.isLoggedIn = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUserAction.pending, (state, action) => {
                state.isLoading = true;
            })
            .addCase(loginUserAction.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isLoggedIn = true;
                state.isLoading = false;
            })
            .addCase(loginUserAction.rejected, (state, action) => {
                state.isLoading = false;
                state.isLoggedIn = false;
                state.error = action.payload;
            })
            .addCase(checkAuthAction.pending, (state, action) => {
                state.isLoading = true;
            })
            .addCase(checkAuthAction.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isLoggedIn = true;
                state.user = action.payload;
            })
            .addCase(checkAuthAction.rejected, (state, action) => {
                state.isLoading = false;
                state.isLoggedIn = false;
                state.error = action.payload;
            });

    },
});

export const { setUser, removeUser } = authSlice.actions;

export default authSlice.reducer;
