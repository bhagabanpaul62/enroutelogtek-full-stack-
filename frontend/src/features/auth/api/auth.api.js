import api from '@/shared/api/axios';

//Registration flow
export const sendOtpApi = (email) => {
    return api.post('/auth/send-otp', { email });
};

export const verifyOtpApi = (otp) => {
    return api.post('/auth/otp-verification', { otp });
};

export const registerApi = (data) => {
    return api.post('/auth/register', data);
};

export const uploadDocumentApi = (fromData, onProgress) => {
    return api.post('/documents/upload', fromData, {
        onUploadProgress: (event) => {
            if (onProgress && event.total) {
                const percent = Math.floor((event.loaded * 100) / event.total);
                onProgress(percent);
            }
        },
    });
};

//delete doc
export const deleteDocument = (documentId) =>{
    return api.post('documents/deleteDocument' , {documentId})
}

export const submitRegistration = (companyId) => {
    return api.post('/auth/submit-registration', { companyId });
};

//LoinFlow
export const loginApi = (email, password) => {
    return api.post('/auth/login', { email, password });
};

// Second login step: the 6-digit code emailed after the password step.
export const verifyLoginOtpApi = (otp) => {
    return api.post('/auth/login/verify-otp', { otp });
};

export const resendLoginOtpApi = () => {
    return api.post('/auth/login/resend-otp');
};

/**
 * The API's reason for a failed call: its human-readable message and, when it sent one, the
 * machine-readable error.code (e.g. LOGIN_RESTART).
 * @returns {{ message: string, code?: string }}
 */
export const apiReason = (error, fallback) => ({
    message: error.response?.data?.message || fallback,
    code: error.response?.data?.error?.code,
});

export const logOutApi = () => {
    return api.post('/auth/logout');
};

//get current user
export const aboutMeApi = () => {
    return api.get('/auth/about-me');
};

/** Sets the signed-in person's own password. Answers with the session user. */
export const changePasswordApi = (currentPassword, newPassword) => {
    return api.post('/auth/change-password', { currentPassword, newPassword });
};

//get Registration Flow
export const getRegistrationFlow = () => {
    return api.get('/auth/get-registration-session');
};

//forget Password
export const forgetPasswordApi = (data) => {
    return api.post('/auth/forget-password', data);
};
