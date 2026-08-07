import { createSlice } from '@reduxjs/toolkit';



const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isLoggedIn: false,
        isLoading: true,
    },

    reducers: {
        adUser: (state, action) => {

        },
        removeUser: (state, action) => {
            
        },
    },
});

export const { adUser, removeUser } = authSlice.actions;

export default authSlice.reducer;
