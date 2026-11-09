import axios from 'axios';


// A 401 from these is the real answer (wrong password, no session left to refresh), not an
// expired access token. Refreshing and retrying would replace it with the refresh's error.
const NO_REFRESH = ['/auth/login', '/auth/logout', '/auth/refresh-token'];

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
            !NO_REFRESH.some((path) => originalRequest.url?.includes(path))
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
