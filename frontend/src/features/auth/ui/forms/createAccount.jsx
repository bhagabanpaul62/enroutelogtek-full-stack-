'use client';
import InputWithLabel from '@/shared/ui/widgets/inputWithLabel';
import { Label } from '@/shared/ui/primitives/label';
import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/primitives/button';
import SelectCheckBox from '@/shared/ui/widgets/selectCheckBox';
import ProgressBar from '@/shared/ui/widgets/progressBar';
import DropDown from '@/shared/ui/widgets/dropDowun';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa6';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

// Country codes for the mobile drop down selector
const countryCodes = ['+1', '+91', '+44', '+81'];

function CreateAccount({ registerHook, progress }) {
    const [countryCode, setCountryCode] = useState('+91');

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm({ defaultValues: registerHook.formData });

    const password = watch('password');

    const handelCountryCode = (value) => {
        console.log(value);
        setCountryCode(value);
    };

    const onSubmit = (data) => {
        const { confirmPassword, ...accountData } = data;
        registerHook.submitAccountStep({ ...accountData, phone: `${countryCode}${data.phone}` });
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
            {/* Header Section */}
            <div className="text-left mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-amber-100 mb-2">
                    Create your account
                </h1>
                <p className="text-sm sm:text-base text-amber-100/60">
                    Start your journey with Enroute Logtek logistics.
                </p>
            </div>

            {/* Progress Bar Container */}
            <div className="mb-8 w-full px-1">
                <ProgressBar label="Progress" percentage={progress} />
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                {/* API Error Display */}
                {registerHook.apiError && (
                    <p className="text-red-400 text-sm text-center p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        {registerHook.apiError}
                    </p>
                )}
                <div className="flex flex-col gap-y-6">
                    {/* Full Name */}
                    <InputWithLabel
                        id="fullName"
                        label="Full Name"
                        inputProps={{
                            placeholder: 'Enter your full name',
                            required: true,
                            ...register('name', { required: 'name is required' }),
                        }}
                    />

                    {/* Mobile Number Container */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="mobileNumber" className="text-amber-100 font-medium">
                            Mobile Number
                        </Label>
                        <div className="flex gap-3">
                            <div className="w-24">
                                <DropDown
                                    label=""
                                    placeholder="+1"
                                    options={countryCodes}
                                    onChange={handelCountryCode}
                                />
                            </div>
                            <div className="flex-1">
                                <InputWithLabel
                                    id="mobileNumber"
                                    label=""
                                    inputProps={{
                                        placeholder: '555-0123',
                                        type: 'tel',
                                        required: true,
                                        maxLength: 10,
                                        ...register('phone', { required: 'phone is required' }),
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <InputWithLabel
                            id="password"
                            label="Password"
                            inputProps={{
                                placeholder: '********',
                                type: 'password',
                                required: true,
                                ...register('password', {
                                    required: 'Password is required',
                                    minLength: {
                                        value: 8,
                                        message: 'Password must be at least 8 characters',
                                    },
                                    pattern: {
                                        value: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
                                        message:
                                            'Must contain uppercase, lowercase, number and special character',
                                    },
                                }),
                            }}
                        />
                        {errors.password && (
                            <p className="text-red-500 text-sm -mt-2 mb-2">
                                {errors.password.message}
                            </p>
                        )}
                        <p className="text-xs text-amber-100/40 mt-1.5">
                            Must be at least 8 characters with one special symbol.
                        </p>
                    </div>

                    {/* Confirm Password */}
                    <InputWithLabel
                        id="confirmPassword"
                        label="Confirm Password"
                        inputProps={{
                            placeholder: '********',
                            type: 'password',
                            required: true,
                            ...register('confirmPassword', {
                                required: 'password is required',
                                validate: (value) => {
                                    return value === password || 'Password do not match';
                                },
                            }),
                        }}
                    />
                    {errors.confirmPassword && (
                        <p className="text-red-500 text-sm -mt-8 mb-2">
                            {errors.confirmPassword.message}
                        </p>
                    )}
                </div>

                {/* Submit Button */}
                <div className="pt-6  flex justify-between items-center">
                    <Button
                        type="button"
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

export default CreateAccount;
