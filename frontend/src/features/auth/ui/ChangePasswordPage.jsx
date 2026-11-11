'use client';

import { PASSWORD_MAX, PASSWORD_MIN, useChangePassword } from '../hooks/useChangePassword';
import AuthShell from './parts/AuthShell';
import Field from './parts/Field';
import Notice from './parts/Notice';
import PasswordInput from './parts/PasswordInput';
import SubmitButton from './parts/SubmitButton';

/**
 * Sets the signed-in person's own password. People added by a team admin land here with the
 * temporary password they were given; anyone signed in can also use it to change theirs.
 */
export default function ChangePasswordPage() {
    const { user, ready, register, handleSubmit, getValues, errors, isSubmitting, apiError, onSubmit, signOut } =
        useChangePassword();

    if (!ready) return null;
    const temporary = Boolean(user?.mustChangePassword);

    return (
        <AuthShell
            title={temporary ? 'Choose your own password.' : 'Change your password.'}
            lead={
                temporary
                    ? `${user?.name ? `Welcome, ${user.name}. ` : ''}Your admin gave you a temporary password. Set one only you know before you continue.`
                    : 'Enter your current password, then the new one.'
            }
            foot={
                <>
                    Not you?{' '}
                    <button
                        type="button"
                        onClick={signOut}
                        className="cursor-pointer text-(--color-ink) underline underline-offset-2"
                    >
                        Sign out
                    </button>
                </>
            }
        >
            <form className="au-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <Field
                    id="currentPassword"
                    label={temporary ? 'Temporary password' : 'Current password'}
                    error={errors.currentPassword?.message}
                >
                    <PasswordInput
                        id="currentPassword"
                        autoComplete="current-password"
                        aria-invalid={errors.currentPassword ? 'true' : undefined}
                        aria-describedby="currentPassword-note"
                        {...register('currentPassword', { required: 'Enter the password you signed in with' })}
                    />
                </Field>

                <Field
                    id="newPassword"
                    label="New password"
                    hint={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters`}
                    error={errors.newPassword?.message}
                >
                    <PasswordInput
                        id="newPassword"
                        autoComplete="new-password"
                        aria-invalid={errors.newPassword ? 'true' : undefined}
                        aria-describedby="newPassword-note"
                        {...register('newPassword', {
                            required: 'Choose a new password',
                            minLength: { value: PASSWORD_MIN, message: `Use at least ${PASSWORD_MIN} characters` },
                            maxLength: { value: PASSWORD_MAX, message: `Use at most ${PASSWORD_MAX} characters` },
                            validate: (value) =>
                                value !== getValues('currentPassword') || 'Choose a password different from the current one',
                        })}
                    />
                </Field>

                <Field id="confirmPassword" label="Repeat new password" error={errors.confirmPassword?.message}>
                    <PasswordInput
                        id="confirmPassword"
                        autoComplete="new-password"
                        aria-invalid={errors.confirmPassword ? 'true' : undefined}
                        aria-describedby="confirmPassword-note"
                        {...register('confirmPassword', {
                            required: 'Repeat the new password',
                            validate: (value) => value === getValues('newPassword') || 'The two passwords differ',
                        })}
                    />
                </Field>

                {apiError && <Notice tone="error">{apiError}</Notice>}

                <div className="au-actions">
                    <SubmitButton busy={isSubmitting}>Save password</SubmitButton>
                </div>
            </form>
        </AuthShell>
    );
}
