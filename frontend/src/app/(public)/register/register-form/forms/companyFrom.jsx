'use client';
import InputWithLabel from '@/components/myUi/inputWithLabel';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import SelectCheckBox from '@/components/myUi/selectCheckBox';
import ProgressBar from '@/components/myUi/progressBar';
import { FaArrowRight } from 'react-icons/fa6';
import { useForm } from 'react-hook-form';

function CompanyForm({ registerHook, progress }) {
    const [companyType, setCompanyType] = useState(registerHook?.formData?.companyType || '');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: registerHook.formData,
    });

    const onSubmit = (data) => {
        registerHook.nextStep({ ...data, companyType });
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
            {/* Header Section */}
            <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-100 mb-2">
                    Company Profile
                </h1>
                <p className="text-xs sm:text-sm text-amber-100/60">
                    Please fill in the details below to set up your business account.
                </p>
            </div>

            {/* Progress Bar Container */}
            <div className="mb-8 w-full px-1">
                <ProgressBar label="Progress" percentage={progress} />
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Company Name */}
                    <InputWithLabel
                        id="companyName"
                        label="Company Name"
                        inputProps={{
                            placeholder: 'Legal Entity Name',
                            required: true,
                            ...register('companyName', { required: 'Company name is required' }),
                        }}
                    />

                    {/* Company Type — spans full width on mobile, fits in grid on desktop */}
                    <div>
                        <Label className="text-sm font-medium text-foreground">Company Type</Label>
                        <SelectCheckBox
                            list={[
                                { id: 1, name: 'Customer', value: 'customer' },
                                { id: 2, name: 'Transporter', value: 'transporter' },
                                { id: 3, name: 'Broker', value: 'broker' },
                                { id: 4, name: 'Fleet Owner', value: 'fleetOwner' },
                            ]}
                            value={companyType}
                            onChange={setCompanyType}
                        />
                    </div>

                    {/* Work Email */}
                    <InputWithLabel
                        id="workEmail"
                        label="Company Email"
                        inputProps={{
                            placeholder: 'corp@company.com',
                            type: 'email',
                            required: true,
                            ...register('companyEmailId', {
                                required: 'Company email is required',
                            }),
                        }}
                    />

                    {/* Phone Number */}
                    <InputWithLabel
                        id="phoneNumber"
                        label="Company Phone Number"
                        inputProps={{
                            placeholder: '+91 98765 43210',
                            type: 'tel',
                            maxLength: 15,
                            minLength: 10,
                            required: true,
                            ...register('companyPhoneNumber', {
                                required: ' Company phone number is required',
                            }),
                        }}
                    />

                    {/* GST Number */}
                    <InputWithLabel
                        id="gst"
                        label="GST Number"
                        inputProps={{
                            placeholder: '22AAAAA0000A1Z5',
                            type: 'text',
                            maxLength: 15,
                            required: ['Customer', 'Transporter'].includes(companyType) && true,
                            ...register('gstNumber'),
                        }}
                    />

                    {/* PAN Number */}
                    <InputWithLabel
                        id="pan"
                        label="Company PAN Number"
                        inputProps={{
                            placeholder: 'ABCDE1234F',
                            type: 'text',
                            maxLength: 10,
                            required: ['Customer', 'Transporter'].includes(companyType) && true,
                            ...register('panNumber'),
                        }}
                    />
                </div>

                {/* Submit Button */}
                <div className="pt-6  flex justify-end items-center">
                    <Button
                        type="submit"
                        className="w-fit py-6 px-6 text-base sm:text-lg font-bold border border-white/20 hover:border-primary/50 transition-all"
                    >
                        Next <FaArrowRight />
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default CompanyForm;
