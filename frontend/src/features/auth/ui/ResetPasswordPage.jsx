'use client';

import Link from 'next/link';
import { Controller } from 'react-hook-form';
import { useForgetPassword } from '../hooks/useForgotPassword';
import { useResendOtp } from '../hooks/useResendOtp';
import AuthShell from './parts/AuthShell';
import Field from './parts/Field';
import Notice from './parts/Notice';
import OtpField from './parts/OtpField';
import PasswordInput from './parts/PasswordInput';
import SubmitButton from './parts/SubmitButton';

export default function ResetPasswordPage() {
    const { control, register, handleSubmit, onSubmit, errors, apiError, userNotExist, email } =
        useForgetPassword();
    const { handelResendOtp, count } = useResendOtp();

    return (
        <AuthShell
            title="Set a new password."
            lead={
                <>
                    Enter the code sent to <span className="measure">{email}</span>, then the new
                    password.
                </>
            }
            foot={
                <>
                    Back to <Link href="/login">log in</Link>
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
                        <Field
                            id="otp"
                            label="6-digit code"
                            error={errors.otp?.message}
                            aside={
                                <button
                                    type="button"
                                    className="au-field__link"
                                    disabled={count > 0}
                                    onClick={handelResendOtp}
                                >
                                    {count > 0 ? `Resend in ${count} s` : 'Resend the code'}
                                </button>
                            }
                        >
                            <OtpField
                                id="otp"
                                value={field.value || ''}
                                onChange={field.onChange}
                                invalid={Boolean(errors.otp)}
                            />
                        </Field>
                    )}
                />

                <Field
                    id="password"
                    label="New password"
                    hint="At least 8 characters."
                    error={errors.password?.message}
                >
                    <PasswordInput
                        id="password"
                        autoComplete="new-password"
                        placeholder="New password"
                        aria-invalid={errors.password ? 'true' : undefined}
                        aria-describedby="password-note"
                        {...register('password', {
                            required: 'Enter a new password',
                            minLength: { value: 8, message: 'At least 8 characters' },
                        })}
                    />
                </Field>

                <Field id="confirmPassword" label="The same password again" error={errors.confirmPassword?.message}>
                    <PasswordInput
                        id="confirmPassword"
                        autoComplete="new-password"
                        placeholder="Repeat it"
                        aria-invalid={errors.confirmPassword ? 'true' : undefined}
                        aria-describedby="confirmPassword-note"
                        {...register('confirmPassword', { required: 'Repeat the new password' })}
                    />
                </Field>

                {userNotExist ? (
                    <Notice tone="error">
                        No account uses <span className="measure">{email}</span>.{' '}
                        <Link href="/register">Register a company</Link> or{' '}
                        <Link href="/forgot-password">try another email</Link>.
                    </Notice>
                ) : (
                    apiError && <Notice tone="error">{apiError}</Notice>
                )}

                <div className="au-actions au-actions--end">
                    <SubmitButton>Set the password</SubmitButton>
                </div>
            </form>
        </AuthShell>
    );
}
