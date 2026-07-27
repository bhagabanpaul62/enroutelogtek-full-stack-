import { registerApi, submitRegistration, uploadDocumentApi } from '@/axios/auth.api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function useRegister() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({});
    const [apiError, setApiError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalSubmission, setFinalSubmissions] = useState(false);
    const [email, setEmail] = useState(null);

    const [registrationResult, setRegistrationResult] = useState(null);
    useEffect(() => {
        setEmail(sessionStorage.getItem('email'));
        if(sessionStorage.getItem('userExists')){
            setFinalSubmissions(true),
            setStep(0)
        }
        const saved = sessionStorage.getItem('registrationResult');
        if (saved) {
            setRegistrationResult(JSON.parse(saved));
            setStep(4);
        }
    }, []);

    // save data and go next
    const nextStep = (stepData) => {
        setFormData((prev) => ({ ...prev, ...stepData }));
        setStep((prev) => prev + 1);
    };

    //go to previous step
    const prevStep = () => {
        setStep((prev) => prev - 1);
    };

    const submitAccountStep = async (accountData) => {
        setApiError('');
        setIsSubmitting(true);

        const allData = { ...formData, ...accountData, email };

        try {
            console.log('allDAta ::', allData);

            const res = await registerApi(allData);
            //save the data
            sessionStorage.setItem('registrationResult', JSON.stringify(res.data.data));
            setRegistrationResult(res.data.data);
            toast.success('Registration Successful');
            setStep(4);
        } catch (error) {
            setApiError(error.response?.data?.message);
            toast.error('Submission account info error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const documentUpload = async (file, documentType, onProgress) => {
        const formDataObj = new FormData();
        formDataObj.append('file', file);
        formDataObj.append('documentType', documentType);
        formDataObj.append('companyId', registrationResult.companyId);
        formDataObj.append('userId', registrationResult.userId);

        try {
            await uploadDocumentApi(formDataObj ,onProgress);
            toast.success(`${documentType} uploaded`);
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Upload failed');
            return false;
        }
    };

    const finalSubmit = async () => {
        setApiError('');
        setIsSubmitting(true);

        try {
            await submitRegistration(registrationResult.companyId);
            toast.success('Application submitted');
            setStep(0)
            setFinalSubmissions(true);

            sessionStorage.removeItem('registrationResult');
            sessionStorage.removeItem('email');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Submission failed');
            setApiError(error.response?.data?.message || 'Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    };
    return {
        step,
        email,
        formData,
        apiError,
        isSubmitting,
        registrationResult,
        nextStep,
        prevStep,
        submitAccountStep,
        documentUpload,
        finalSubmit,
        finalSubmission,
    };
}
