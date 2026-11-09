import { registerApi, submitRegistration, uploadDocumentApi } from '@/features/auth/api/auth.api';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSessionStorageItem } from '@/shared/hooks/useSessionStorageItem';

export function useRegister() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({});
    const [apiError, setApiError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalSubmission, setFinalSubmissions] = useState(false);
    // Read on every render, not once at mount: the registration guard (useRegistrationFlow)
    // stores the email after this page has mounted, e.g. when the form is opened in a new tab.
    const email = useSessionStorageItem('email');
    
    const [registrationResult, setRegistrationResult] = useState(null);
    // Restore saved progress after a reload. This has to run after hydration (sessionStorage
    // doesn't exist on the server), so here setState inside an effect is intended.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        const savedFromData = sessionStorage.getItem('fromData');
        if (savedFromData) setFormData(JSON.parse(savedFromData));
        if (sessionStorage.getItem('userExists')) {
            (setFinalSubmissions(true), setStep(0));
        
        }
        const saved = sessionStorage.getItem('registrationResult');
        if (saved) {
            setRegistrationResult(JSON.parse(saved));
            setStep(4);
        }
    }, []);
    /* eslint-enable react-hooks/set-state-in-effect */

    // save data and go next
    const nextStep = (stepData) => {
        const update = { ...formData, ...stepData };
        setFormData(update);
        sessionStorage.setItem('fromData', JSON.stringify(update));
        setStep((prev) => prev + 1);
    };

    // Go back one step. stepData is what was typed on the step being left, so going back and
    // forward again keeps it. Callers never pass passwords: formData lives in sessionStorage.
    const prevStep = (stepData) => {
        if (stepData) {
            const update = { ...formData, ...stepData };
            setFormData(update);
            sessionStorage.setItem('fromData', JSON.stringify(update));
        }
        setStep((prev) => prev - 1);
    };

    const submitAccountStep = async (accountData) => {
        setApiError('');
        setIsSubmitting(true);

        const allData = { ...formData, ...accountData, email };

        try {

            const res = await registerApi(allData);
            //save the data
            sessionStorage.setItem('registrationResult', JSON.stringify(res.data.data));
            setRegistrationResult(res.data.data);
            toast.success('Data Save Successful');
            setStep(4);
        } catch (error) {
            const message = error.response?.data?.message || 'Submission account info error';

            setApiError(message);
            toast.error(message);

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
            const res = await uploadDocumentApi(formDataObj, onProgress);
            toast.success(`${documentType} uploaded`);
            return res.data.data ;
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
            setStep(0);
            setFinalSubmissions(true);

            sessionStorage.removeItem('registrationResult');
            sessionStorage.removeItem('userExists'); // ← ADD THIS
            sessionStorage.removeItem('fromData');
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
