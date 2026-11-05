'use client';

import Link from 'next/link';
import { useSendOtp } from '@/features/auth/hooks/useSendOtp';
import AuthShell from './parts/AuthShell';
import Field from './parts/Field';
import Notice from './parts/Notice';
import SubmitButton from './parts/SubmitButton';

// Step 0 of registration: the email that will own the account gets a one-time code.
export default function RegisterPage() {
    const { register, onSubmit, apiError, errors, handleSubmit, isSubmitting } = useSendOtp();

    return (
        <AuthShell
            title="Register your company."
            lead="Start with the email that will own the account. A code goes there first."
            foot={
                <>
                    Already registered? <Link href="/login">Log in</Link>
                </>
            }
        >
            <form className="au-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <Field
                    id="email"
                    label="Your work email"
                    hint="The first admin login for the company."
                    error={errors.email?.message}
                >
                    <input
                        id="email"
                        className="au-input"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="name@example.com"
                        aria-invalid={errors.email ? 'true' : undefined}
                        aria-describedby="email-note"
                        {...register('email', {
                            required: 'Email is required',
                            pattern: { value: /^\S+@\S+\.\S+$/, message: 'That does not look like an email' },
                        })}
                    />
                </Field>

                {apiError && <Notice tone="error">{apiError}</Notice>}

                <div className="au-actions au-actions--end">
                    <SubmitButton busy={isSubmitting}>Send the code</SubmitButton>
                </div>
            </form>
        </AuthShell>
    );
}
