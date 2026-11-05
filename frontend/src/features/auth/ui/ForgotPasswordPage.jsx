'use client';

import Link from 'next/link';
import { useSendOtp } from '../hooks/useSendOtp';
import AuthShell from './parts/AuthShell';
import Field from './parts/Field';
import Notice from './parts/Notice';
import SubmitButton from './parts/SubmitButton';

export default function ForgotPasswordPage() {
    const { register, handleSubmit, errors, isSubmitting, onSubmit, apiError } = useSendOtp();

    return (
        <AuthShell
            title="Reset your password."
            lead="Enter the email you log in with. A one-time code goes there."
            foot={
                <>
                    Remembered it? <Link href="/login">Log in</Link>
                </>
            }
        >
            <form className="au-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <Field id="email" label="Email" error={errors.email?.message}>
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
