import { create } from 'zustand';
import { getMeApi } from '@/axios/auth.api';

 const useAuthStore = create((set) => ({
    //Sate
    user: null,
    isLoggedIn: false,
    isLoading: true,

    //Action
    setUser: (userData) => {
        set({ user: userData, isLoggedIn: true, isLoading: false });
    },

    clearUser: () =>{
        set({user:null,isLoggedIn:false,isLoading:false})
    },

    checkAuth : async()=>{
        try {
            const res = await getMeApi();
            set({
                user:res.data.data,
                isLoggedIn:true,
                isLoading:false,
            })
        } catch (error) {
            set({
                user:null,
                isLoggedIn:false,
                isLoading:false,
            })
        }
    }
}));

export default useAuthStore