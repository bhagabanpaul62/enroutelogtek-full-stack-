'use client';
import InputWithLabel from '@/shared/ui/widgets/inputWithLabel';
import { Label } from '@/shared/ui/primitives/label';
import { useState } from 'react';
import { Button } from '@/shared/ui/primitives/button';
import SelectCheckBox from '@/shared/ui/widgets/selectCheckBox';
import ProgressBar from '@/shared/ui/widgets/progressBar';
import DropDown from '@/shared/ui/widgets/dropDowun';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa6';
import { useForm } from 'react-hook-form';

const indianStates = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
];

function BranchDetails({ progress, registerHook }) {
    const [state, setState] = useState(registerHook.formData.state || '');
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: registerHook.formData,
    });
    const stateHandle = (value) => {
        setState(value);
    };

    const onSubmit = (data) => {
        registerHook.nextStep({ ...data, state });
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
            {/* Header Section */}
            <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-100 mb-2">
                    Branch Details
                </h1>
                <p className="text-xs sm:text-sm text-amber-100/60">
                    Please provide the primary operational location for your organization.
                </p>
            </div>

            {/* Progress Bar Container */}
            <div className="mb-8 w-full px-1">
                <ProgressBar label="Progress" percentage={progress} />
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Branch Name */}
                    <InputWithLabel
                        id="branchName"
                        label="Branch Name"
                        inputProps={{
                            placeholder: 'e.g. Headquarters - North',
                            required: true,
                            ...register('branchName', { required: 'branch name required' }),
                        }}
                    />

                    {/* Branch Code */}
                    <InputWithLabel
                        id="branchCode"
                        label="Branch Code"
                        inputProps={{
                            placeholder: 'Enter your branch code ',
                            required: true,
                            ...register('branchCode', { required: 'branch code required' }),
                        }}
                    />

                    {/* Street Address */}
                    <InputWithLabel
                        id="streetAddress"
                        label="Street Address"
                        inputProps={{
                            placeholder: '123 Logistics Way, Suite 400',
                            type: 'text',
                            required: true,
                            ...register('address', { required: ' address is required' }),
                        }}
                    />

                    <InputWithLabel
                        id="city"
                        label="City"
                        inputProps={{
                            placeholder: 'Kolkata',
                            type: 'text',
                            required: true,
                            ...register('city', { required: ' city is required' }),
                        }}
                    />

                    <div className="w-full ">
                        <DropDown
                            label={'State'}
                            className=""
                            placeholder="Select State"
                            options={indianStates}
                            value={state}
                            onChange={stateHandle}
                        />
                    </div>

                    <InputWithLabel
                        id="Pin"
                        label="Pin Number"
                        inputProps={{
                            placeholder: '700039',
                            type: 'text',
                            maxLength: 7,
                            ...register('pinCode', { required: 'pin code is required' }),
                        }}
                    />
                </div>

                {/* Submit Button */}
                <div className="pt-6  flex justify-between items-center">
                    <Button
                        onClick={registerHook.prevStep}
                        className="w-fit py-6 px-6 text-base sm:text-lg font-bold border border-white/20 hover:border-primary/50 transition-all"
                    >
                        <FaArrowLeft /> Prev
                    </Button>
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

export default BranchDetails;
