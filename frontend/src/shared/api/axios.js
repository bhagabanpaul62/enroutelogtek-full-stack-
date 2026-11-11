import axios from 'axios';
import {
    AUTH_NOTICE_KEY,
    CHANGE_PASSWORD_PATH,
    PASSWORD_CHANGE_REQUIRED,
    SESSION_REPLACED,
} from '@/shared/lib/authStorage';

// A 401 from these is the real answer (wrong password, no session left to refresh), not an
// expired access token. Refreshing and retrying would replace it with the refresh's error.
const NO_REFRESH = ['/auth/login', '/auth/logout', '/auth/refresh-token'];

//API INSTANCE
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    withCredentials: true,
});

// A newer login on another device ended this session. Leave whatever page this is and show the
// login page with the reason. A full page load also drops everything the store held for the old user.
const signOutHere = (message) => {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(AUTH_NOTICE_KEY, message);
    } catch {
        // Storage can be blocked (private mode); the login page then shows no reason, which is fine.
    }
    if (window.location.pathname !== '/login') window.location.replace('/login');
};

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        // The account still has a temporary password from an admin: nothing else works until
        // the person sets their own, so take them there from wherever they are.
        if (
            error.response?.status === 403 &&
            error.response?.data?.error?.code === PASSWORD_CHANGE_REQUIRED &&
            typeof window !== 'undefined' &&
            window.location.pathname !== CHANGE_PASSWORD_PATH
        ) {
            window.location.replace(CHANGE_PASSWORD_PATH);
        }

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
                const body = refreshError.response?.data;
                if (body?.error?.code === SESSION_REPLACED) signOutHere(body.message);
                throw refreshError;
            }
        }

        throw error;
    },
);

export default api;
