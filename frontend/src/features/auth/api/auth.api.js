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

export const logOutApi = () => {
    return api.post('/auth/logout');
};

//get current user
export const aboutMeApi = () => {
    return api.get('/auth/about-me');
};

//get Registration Flow
export const getRegistrationFlow = () => {
    return api.get('/auth/get-registration-session');
};

//forget Password
export const forgetPasswordApi = (data) => {
    return api.post('/auth/forget-password', data);
};
