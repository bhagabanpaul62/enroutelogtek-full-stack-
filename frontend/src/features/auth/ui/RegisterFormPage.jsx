'use client';
import CompanyForm from './forms/companyFrom';
import BranchDetails from './forms/branchDetails';
import CreateAccount from './forms/createAccount';
import DocumentsUpload from './forms/documentsUpload';
import { useRegistrationFlow } from '@/features/auth/hooks/useRegistrationFlow';
import Submit from './Submit';
import { useRegister } from '@/features/auth/hooks/useRegister';
import { useEffect, useState } from 'react';

function Page() {
    const [progress, setProgress] = useState(25);
    const register = useRegister();

    // const progress = register.step * 25; progress
    useEffect(() => {
        setProgress(register.step * 25);
    }, [register.step]);

    const { isAllow } = useRegistrationFlow();
    if (!isAllow) {
        return null;
    }

    return (
        <section className="min-h-screen w-full bg-gradient-to-br from-neutral-950  via-neutral-900 to-neutral-950 text-amber-100 flex justify-center items-center px-4 py-24 md:py-24">
            <div className="w-full h-full max-w-6xl mx-auto flex flex-col justify-center items-center">
                {/* Main Card Wrapper */}
                <div className="w-full bg-neutral-900/40 backdrop-blur-md p-6 sm:p-8 md:p-10 border border-white/10 md:border-white/15 rounded-3xl shadow-2xl shadow-black/40 transition-all duration-300">
                    {/* Form Container */}
                    <div className="w-full">
                        {register.step === 1 && (
                            <CompanyForm progress={progress} registerHook={register} />
                        )}
                        {register.step === 2 && (
                            <BranchDetails progress={progress} registerHook={register} />
                        )}
                        {register.step === 3 && (
                            <CreateAccount progress={progress} registerHook={register} />
                        )}
                        {register.step === 4 && (
                            <DocumentsUpload progress={progress} registerHook={register} />
                        )}
                        {register.finalSubmission === true && <Submit />}
                    </div>
                </div>

                {/* Optional subtle footer note */}
                <p className="mt-6 text-xs text-amber-100/40 tracking-wide">
                    Secure & Encrypted Connection
                </p>
            </div>
        </section>
    );
}

export default Page;
