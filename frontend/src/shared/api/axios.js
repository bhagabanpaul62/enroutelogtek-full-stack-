import axios from 'axios';


//API INSTANCE
const api = axios.create({      
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    withCredentials: true,
});



api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;
        
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes('/auth/refresh-token')
        ) {
            originalRequest._retry = true;

            try {
                await api.post('/auth/refresh-token');
                return api(originalRequest);
            } catch (refreshError) {
                
                throw refreshError;
            }
        }

        throw error;
    },
);

export default api;
