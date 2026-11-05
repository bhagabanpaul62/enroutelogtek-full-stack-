'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Field from '../parts/Field';
import SelectField from '../parts/SelectField';
import SubmitButton from '../parts/SubmitButton';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export default function BranchDetails({ registerHook }) {
    const [state, setState] = useState(registerHook.formData.state || '');
    const [stateError, setStateError] = useState('');
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({ defaultValues: registerHook.formData });

    const onSubmit = (data) => {
        if (!state) {
            setStateError('Choose a state');
            return;
        }
        registerHook.nextStep({ ...data, state });
    };

    return (
        <form className="au-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="au-form__row">
                <Field id="branchName" label="Branch name" error={errors.branchName?.message}>
                    <input
                        id="branchName"
                        className="au-input"
                        placeholder="Head office"
                        aria-invalid={errors.branchName ? 'true' : undefined}
                        aria-describedby="branchName-note"
                        {...register('branchName', { required: 'Branch name is required' })}
                    />
                </Field>

                <Field id="branchCode" label="Branch code" hint="Your own short code for it." error={errors.branchCode?.message}>
                    <input
                        id="branchCode"
                        className="au-input au-input--mono"
                        placeholder="HO-01"
                        aria-invalid={errors.branchCode ? 'true' : undefined}
                        aria-describedby="branchCode-note"
                        {...register('branchCode', { required: 'Branch code is required' })}
                    />
                </Field>

                <Field id="address" label="Street address" error={errors.address?.message}>
                    <input
                        id="address"
                        className="au-input"
                        autoComplete="street-address"
                        placeholder="Plot 12, MIDC Phase 2"
                        aria-invalid={errors.address ? 'true' : undefined}
                        aria-describedby="address-note"
                        {...register('address', { required: 'Address is required' })}
                    />
                </Field>

                <Field id="city" label="City" error={errors.city?.message}>
                    <input
                        id="city"
                        className="au-input"
                        autoComplete="address-level2"
                        placeholder="Pune"
                        aria-invalid={errors.city ? 'true' : undefined}
                        aria-describedby="city-note"
                        {...register('city', { required: 'City is required' })}
                    />
                </Field>

                <Field id="state" label="State" error={stateError || undefined}>
                    <SelectField
                        id="state"
                        value={state}
                        onChange={(value) => {
                            setState(value);
                            setStateError('');
                        }}
                        options={INDIAN_STATES}
                        placeholder="Choose a state"
                    />
                </Field>

                <Field id="pinCode" label="PIN code" error={errors.pinCode?.message}>
                    <input
                        id="pinCode"
                        className="au-input au-input--mono"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="postal-code"
                        placeholder="411001"
                        aria-invalid={errors.pinCode ? 'true' : undefined}
                        aria-describedby="pinCode-note"
                        {...register('pinCode', { required: 'PIN code is required' })}
                    />
                </Field>
            </div>

            <div className="au-actions">
                <SubmitButton type="button" quiet onClick={registerHook.prevStep}>
                    Back
                </SubmitButton>
                <SubmitButton>Next: your account</SubmitButton>
            </div>
        </form>
    );
}
