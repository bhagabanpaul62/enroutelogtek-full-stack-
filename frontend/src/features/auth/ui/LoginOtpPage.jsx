'use client';

import Link from 'next/link';
import { Controller } from 'react-hook-form';
import { useLoginOtp } from '@/features/auth/hooks/useLoginOtp';
import AuthShell from './parts/AuthShell';
import Field from './parts/Field';
import Notice from './parts/Notice';
import OtpField from './parts/OtpField';
import SubmitButton from './parts/SubmitButton';

/** Second login step: the 6-digit code emailed after the password was accepted. */
export default function LoginOtpPage() {
    const {
        control,
        handleSubmit,
        errors,
        isSubmitting,
        apiError,
        mustRestart,
        onSubmit,
        email,
        count,
        resend,
        resending,
    } = useLoginOtp();

    return (
        <AuthShell
            title="Check your email."
            lead={
                <>
                    We sent a 6-digit code to{' '}
                    {email ? <span className="measure">{email}</span> : 'your email'}. It expires in
                    10 minutes. Logging in here signs this account out on any other device.
                </>
            }
            foot={
                <>
                    Wrong account? <Link href="/login">Back to log in</Link>
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

                {apiError && (
                    <Notice tone="error">
                        {apiError}
                        {mustRestart && (
                            <>
                                {' '}
                                <Link href="/login">Log in again</Link>
                            </>
                        )}
                    </Notice>
                )}

                <div className="au-actions">
                    <button
                        type="button"
                        className="mk-btn"
                        disabled={count > 0 || resending || mustRestart}
                        onClick={resend}
                    >
                        {count > 0 ? `Resend in ${count} s` : 'Resend the code'}
                    </button>
                    <SubmitButton busy={isSubmitting} disabled={mustRestart}>
                        Log in
                    </SubmitButton>
                </div>
            </form>
        </AuthShell>
    );
}
