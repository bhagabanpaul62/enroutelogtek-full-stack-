'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Field from '../parts/Field';
import SubmitButton from '../parts/SubmitButton';
import TypeChoice from '../parts/TypeChoice';

// Registration asks shippers and transporters for GST and PAN; brokers and fleet owners for PAN.
const NEEDS_GST = ['customer', 'transporter'];

export default function CompanyForm({ registerHook }) {
    const [companyType, setCompanyType] = useState(registerHook?.formData?.companyType || '');
    const [typeError, setTypeError] = useState('');
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({ defaultValues: registerHook.formData });

    const needsGst = NEEDS_GST.includes(companyType);

    const onSubmit = (data) => {
        if (!companyType) return;
        registerHook.nextStep({ ...data, companyType });
    };

    // react-hook-form only calls onSubmit once its own fields are valid, so the company type
    // (kept outside the form) is checked here too: every missing field shows on the first press.
    const submit = (event) => {
        if (!companyType) setTypeError('Choose a company type');
        return handleSubmit(onSubmit)(event);
    };

    return (
        <form className="au-form" onSubmit={submit} noValidate>
            <TypeChoice
                value={companyType}
                onChange={(value) => {
                    setCompanyType(value);
                    setTypeError('');
                }}
                error={typeError || undefined}
            />

            <div className="au-form__row">
                <Field id="companyName" label="Company name" error={errors.companyName?.message}>
                    <input
                        id="companyName"
                        className="au-input"
                        autoComplete="organization"
                        placeholder="The legal entity"
                        aria-invalid={errors.companyName ? 'true' : undefined}
                        aria-describedby="companyName-note"
                        {...register('companyName', { required: 'Company name is required' })}
                    />
                </Field>

                <Field id="companyEmailId" label="Company email" error={errors.companyEmailId?.message}>
                    <input
                        id="companyEmailId"
                        className="au-input"
                        type="email"
                        inputMode="email"
                        placeholder="office@example.com"
                        aria-invalid={errors.companyEmailId ? 'true' : undefined}
                        aria-describedby="companyEmailId-note"
                        {...register('companyEmailId', { required: 'Company email is required' })}
                    />
                </Field>

                <Field id="companyPhoneNumber" label="Company phone" error={errors.companyPhoneNumber?.message}>
                    <input
                        id="companyPhoneNumber"
                        className="au-input au-input--mono"
                        type="tel"
                        inputMode="tel"
                        maxLength={15}
                        placeholder="+91 98765 43210"
                        aria-invalid={errors.companyPhoneNumber ? 'true' : undefined}
                        aria-describedby="companyPhoneNumber-note"
                        {...register('companyPhoneNumber', { required: 'Company phone is required' })}
                    />
                </Field>

                <Field
                    id="gstNumber"
                    label={
                        needsGst ? (
                            'GST number'
                        ) : (
                            <>
                                GST number <small>(optional)</small>
                            </>
                        )
                    }
                    hint="15 characters"
                    error={errors.gstNumber?.message}
                >
                    <input
                        id="gstNumber"
                        className="au-input au-input--mono"
                        maxLength={15}
                        autoCapitalize="characters"
                        placeholder="22AAAAA0000A1Z5"
                        aria-invalid={errors.gstNumber ? 'true' : undefined}
                        aria-describedby="gstNumber-note"
                        {...register('gstNumber', {
                            validate: (value) =>
                                !needsGst ||
                                Boolean(value?.trim()) ||
                                'GST is required for shippers and transporters',
                        })}
                    />
                </Field>

                <Field id="panNumber" label="PAN" hint="10 characters" error={errors.panNumber?.message}>
                    <input
                        id="panNumber"
                        className="au-input au-input--mono"
                        maxLength={10}
                        autoCapitalize="characters"
                        placeholder="ABCDE1234F"
                        aria-invalid={errors.panNumber ? 'true' : undefined}
                        aria-describedby="panNumber-note"
                        {...register('panNumber', { required: 'PAN is required' })}
                    />
                </Field>
            </div>

            <div className="au-actions au-actions--end">
                <SubmitButton>Next: branch</SubmitButton>
            </div>
        </form>
    );
}
