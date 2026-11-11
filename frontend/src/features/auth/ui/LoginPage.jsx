'use client';

import Link from 'next/link';
import { useLogin } from '@/features/auth/hooks/useLogin';
import AuthShell from './parts/AuthShell';
import Field from './parts/Field';
import Notice from './parts/Notice';
import PasswordInput from './parts/PasswordInput';
import SubmitButton from './parts/SubmitButton';

export default function LoginPage() {
    const { register, handleSubmit, errors, isSubmitting, apiError, notice, onSubmit } = useLogin();
    // The API refuses logins for companies that are not approved yet; point those people to the status page.
    const waiting = /pending|approv/i.test(apiError ?? '');

    return (
        <AuthShell
            title="Log in."
            lead="Your company's RFQs, network and trips."
            foot={
                <>
                    New here? <Link href="/register">Register your company</Link>
                </>
            }
        >
            <form className="au-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                {/* Set by the API client when a login on another device ended this tab's session. */}
                {notice && <Notice tone="info">{notice}</Notice>}

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

                <Field
                    id="password"
                    label="Password"
                    error={errors.password?.message}
                    aside={<Link href="/forgot-password">Forgot it?</Link>}
                >
                    <PasswordInput
                        id="password"
                        autoComplete="current-password"
                        placeholder="Your password"
                        aria-invalid={errors.password ? 'true' : undefined}
                        aria-describedby="password-note"
                        {...register('password', { required: 'Password is required' })}
                    />
                </Field>

                {apiError && (
                    <Notice tone="error">
                        {apiError}
                        {waiting && (
                            <>
                                {' '}
                                <Link href="/waiting-approval">What happens while you wait</Link>
                            </>
                        )}
                    </Notice>
                )}

                <div className="au-actions au-actions--end">
                    <SubmitButton busy={isSubmitting}>Log in</SubmitButton>
                </div>
            </form>
        </AuthShell>
    );
}
