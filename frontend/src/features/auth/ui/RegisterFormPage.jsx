'use client';

import { useRegister } from '@/features/auth/hooks/useRegister';
import { useRegistrationFlow } from '@/features/auth/hooks/useRegistrationFlow';
import AuthShell from './parts/AuthShell';
import ApplicationStatus from './parts/ApplicationStatus';
import StepList from './parts/StepList';
import CompanyForm from './forms/companyFrom';
import BranchDetails from './forms/branchDetails';
import CreateAccount from './forms/createAccount';
import DocumentsUpload from './forms/documentsUpload';

const STEP_COPY = {
    1: ['Company.', 'The legal entity that will hold the account.'],
    2: ['Branch.', 'The site you operate from.'],
    3: ['Your account.', 'The first admin login for this company.'],
    4: ['Documents.', 'Checked by a person before the company is approved.'],
};

export default function RegisterFormPage() {
    const register = useRegister();
    const { isAllow } = useRegistrationFlow();

    if (!isAllow) return null;
    if (register.finalSubmission) return <ApplicationStatus />;

    const [title, lead] = STEP_COPY[register.step] ?? STEP_COPY[1];

    return (
        <AuthShell wide title={title} lead={lead} aside={<StepList current={register.step} />}>
            {register.step === 1 && <CompanyForm registerHook={register} />}
            {register.step === 2 && <BranchDetails registerHook={register} />}
            {register.step === 3 && <CreateAccount registerHook={register} />}
            {register.step === 4 && <DocumentsUpload registerHook={register} />}
        </AuthShell>
    );
}
