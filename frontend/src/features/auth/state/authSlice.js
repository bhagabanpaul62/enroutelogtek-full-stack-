import { createSlice } from '@reduxjs/toolkit';
import { checkAuthAction, loginUserAction, logoutUserAction } from './authAction';

const signedOut = (state) => {
    state.user = null;
    state.isLoggedIn = false;
    state.isLoading = false;
};

/** Session state: the signed-in user, whether a session check is still running, and the last error. */
const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isLoggedIn: false,
        isLoading: true,
        error: undefined,
    },

    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
            state.isLoggedIn = true;
            state.isLoading = false;
        },
        removeUser: signedOut,
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUserAction.pending, (state) => {
                state.isLoading = true;
                state.error = undefined;
            })
            .addCase(loginUserAction.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isLoggedIn = true;
                state.isLoading = false;
            })
            .addCase(loginUserAction.rejected, (state, action) => {
                signedOut(state);
                state.error = action.payload;
            })
            .addCase(checkAuthAction.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(checkAuthAction.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isLoggedIn = true;
                state.user = action.payload;
            })
            .addCase(checkAuthAction.rejected, (state, action) => {
                signedOut(state);
                state.error = action.payload;
            })
            .addCase(logoutUserAction.fulfilled, (state) => {
                signedOut(state);
                state.error = undefined;
            })
            .addCase(logoutUserAction.rejected, (state, action) => {
                // The server still holds the session, so the user stays signed in here too.
                state.error = action.payload;
            });
    },
});

export const { setUser, removeUser } = authSlice.actions;

export default authSlice.reducer;
