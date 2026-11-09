'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Field from '../parts/Field';
import Notice from '../parts/Notice';
import PasswordInput from '../parts/PasswordInput';
import SelectField from '../parts/SelectField';
import SubmitButton from '../parts/SubmitButton';

const COUNTRY_CODES = ['+91', '+1', '+44', '+81'];

export default function CreateAccount({ registerHook }) {
    const [countryCode, setCountryCode] = useState(registerHook.formData.countryCode || '+91');
    const {
        register,
        handleSubmit,
        watch,
        getValues,
        formState: { errors },
    } = useForm({ defaultValues: registerHook.formData });

    const password = watch('password');

    const onSubmit = (data) => {
        const { confirmPassword, ...accountData } = data;
        registerHook.submitAccountStep({ ...accountData, phone: `${countryCode}${data.phone}` });
    };

    return (
        <form className="au-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {registerHook.apiError && <Notice tone="error">{registerHook.apiError}</Notice>}

            <div className="au-form__row">
                <Field id="name" label="Your name" error={errors.name?.message}>
                    <input
                        id="name"
                        className="au-input"
                        autoComplete="name"
                        placeholder="As on your ID"
                        aria-invalid={errors.name ? 'true' : undefined}
                        aria-describedby="name-note"
                        {...register('name', { required: 'Your name is required' })}
                    />
                </Field>

                <Field id="phone" label="Mobile number" error={errors.phone?.message}>
                    <div className="au-phone">
                        <SelectField
                            id="countryCode"
                            value={countryCode}
                            onChange={setCountryCode}
                            options={COUNTRY_CODES}
                            placeholder="+91"
                        />
                        <input
                            id="phone"
                            className="au-input au-input--mono"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel-national"
                            maxLength={10}
                            placeholder="98765 43210"
                            aria-invalid={errors.phone ? 'true' : undefined}
                            aria-describedby="phone-note"
                            {...register('phone', { required: 'Mobile number is required' })}
                        />
                    </div>
                </Field>

                <Field
                    id="password"
                    label="Password"
                    hint="8 or more characters, with a capital, a number and a symbol."
                    error={errors.password?.message}
                >
                    <PasswordInput
                        id="password"
                        autoComplete="new-password"
                        placeholder="Choose a password"
                        aria-invalid={errors.password ? 'true' : undefined}
                        aria-describedby="password-note"
                        {...register('password', {
                            required: 'Password is required',
                            minLength: { value: 8, message: 'At least 8 characters' },
                            pattern: {
                                value: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
                                message: 'Needs a capital, a small letter, a number and a symbol',
                            },
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
                        {...register('confirmPassword', {
                            required: 'Repeat the password',
                            validate: (value) => value === password || 'The passwords do not match',
                        })}
                    />
                </Field>
            </div>

            <div className="au-actions">
                <SubmitButton
                    type="button"
                    quiet
                    disabled={registerHook.isSubmitting}
                    // Keep what was typed, but never the passwords (formData is stored in sessionStorage).
                    onClick={() =>
                        registerHook.prevStep({ name: getValues('name'), phone: getValues('phone'), countryCode })
                    }
                >
                    Back
                </SubmitButton>
                <SubmitButton busy={registerHook.isSubmitting}>Create the account</SubmitButton>
            </div>
        </form>
    );
}
