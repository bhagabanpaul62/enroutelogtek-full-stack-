'use client';

import Link from 'next/link';
import { Controller } from 'react-hook-form';
import { useRegistrationFlow } from '@/features/auth/hooks/useRegistrationFlow';
import { useResendOtp } from '@/features/auth/hooks/useResendOtp';
import { useVerifyOtp } from '@/features/auth/hooks/useVerifyOtp';
import AuthShell from './parts/AuthShell';
import Field from './parts/Field';
import Notice from './parts/Notice';
import OtpField from './parts/OtpField';
import SubmitButton from './parts/SubmitButton';

export default function VerifyOtpPage() {
    const { isAllow } = useRegistrationFlow();
    const { control, handleSubmit, errors, isSubmitting, apiError, onSubmit, email } = useVerifyOtp();
    const { handelResendOtp, count } = useResendOtp();

    if (!isAllow) return null;

    return (
        <AuthShell
            title="Enter the code."
            lead={
                <>
                    Sent to <span className="measure">{email}</span>. It expires in 10 minutes.
                </>
            }
            foot={
                <>
                    Wrong address? <Link href="/register">Start again</Link>
                </>
            }
        >
            <form className="au-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <Controller
                    name="otp"
                    control={control}
                    rules={{
                        required: 'Enter the code',
                        minLength: { value: 6, message: 'Enter all 6 digits' },
                    }}
                    render={({ field }) => (
                        <Field id="otp" label="6-digit code" error={errors.otp?.message}>
                            <OtpField
                                id="otp"
                                value={field.value || ''}
                                onChange={field.onChange}
                                invalid={Boolean(errors.otp)}
                            />
                        </Field>
                    )}
                />

                {apiError && <Notice tone="error">{apiError}</Notice>}

                <div className="au-actions">
                    <button
                        type="button"
                        className="mk-btn"
                        disabled={count > 0}
                        onClick={handelResendOtp}
                    >
                        {count > 0 ? `Resend in ${count} s` : 'Resend the code'}
                    </button>
                    <SubmitButton busy={isSubmitting}>Verify</SubmitButton>
                </div>
            </form>
        </AuthShell>
    );
}
