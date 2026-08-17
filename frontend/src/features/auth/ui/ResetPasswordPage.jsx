'use client';

import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdLockReset } from 'react-icons/md';

import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/shared/ui/primitives/input-otp';

import { useForgetPassword } from '../hooks/useForgotPassword';
import { useResendOtp } from '../hooks/useResendOtp';
import UserNotExist from './userNotExist';

function ResetPassword() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { control, register, handleSubmit, onSubmit, errors, apiError ,userNotExist } = useForgetPassword();
    const { handelResendOtp, count } = useResendOtp();

    return (
        <section className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-4 py-12 text-amber-100">
            {userNotExist ? (
                <UserNotExist />
            ) : (
                <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/60 p-6 shadow-2xl backdrop-blur-md sm:p-8">
                    {/* Header */}
                    <div className="mb-8 text-center sm:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-amber-100 sm:text-4xl">
                            Reset Password
                        </h2>
                        <p className="mt-2 text-sm text-amber-100/80">
                            Create a new, strong password for your account.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* OTP Section */}
                        <div className="flex flex-col items-center gap-2">
                            <Controller
                                name="otp"
                                rules={{
                                    required: 'OTP is required',
                                    minLength: { value: 6, message: 'Enter all 6 digits' },
                                }}
                                control={control}
                                render={({ field }) => (
                                    <InputOTP
                                        maxLength={6}
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        autoFocus
                                    >
                                        <InputOTPGroup className="flex gap-2">
                                            {[...Array(6)].map((_, i) => (
                                                <InputOTPSlot
                                                    key={i}
                                                    index={i}
                                                    className="h-12 w-10 rounded-xl border border-white/20 bg-neutral-950/50 text-xl font-semibold text-amber-100 transition-all focus-within:border-amber-400 sm:h-14 sm:w-12 sm:text-2xl"
                                                />
                                            ))}
                                        </InputOTPGroup>
                                    </InputOTP>
                                )}
                            />

                            {/* Error Messages */}
                            {errors.otp && (
                                <p className="w-full text-center text-xs font-medium text-red-500">
                                    {errors.otp.message}
                                </p>
                            )}
                            {apiError && (
                                <p className="w-full text-center text-xs font-medium text-red-500">
                                    {apiError}
                                </p>
                            )}
                        </div>

                        {/* OTP Meta Info */}
                        <div className="flex items-center justify-between text-xs font-medium text-amber-100">
                            <span>
                                Expires in: <strong className="text-red-600">10 minutes</strong>
                            </span>
                            {count > 0 ? (
                                <span className="text-amber-100/50">Resend OTP in {count}s</span>
                            ) : (
                                <button
                                    type="button"
                                    className="text-amber-100 hover:text-amber-200 transition-colors cursor-pointer"
                                    onClick={handelResendOtp}
                                >
                                    Resend OTP
                                </button>
                            )}
                        </div>

                        {/* New Password */}
                        <div className="space-y-1.5">
                            <label
                                className="block text-sm font-medium text-amber-100"
                                htmlFor="newPassword"
                            >
                                New Password
                            </label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    {...register('password')}
                                    className="h-11 border-white/10 bg-neutral-950/40 pr-10 text-amber-100 placeholder:text-neutral-400 focus:border-amber-400"
                                    placeholder="Enter a strong password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-100/70 hover:text-amber-100"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-500">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label
                                className="block text-sm font-medium text-amber-100"
                                htmlFor="confirmPassword"
                            >
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    {...register('confirmPassword')}
                                    className="h-11 border-white/10 bg-neutral-950/40 pr-10 text-amber-100 placeholder:text-neutral-400 focus:border-amber-400"
                                    placeholder="Enter a strong password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-100/70 hover:text-amber-100"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
                                        <FaEyeSlash size={18} />
                                    ) : (
                                        <FaEye size={18} />
                                    )}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-xs text-red-500">
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="flex h-12 w-full items-center justify-center gap-2 text-base font-semibold text-amber-100 transition-all hover:opacity-90"
                        >
                            Reset Password
                            <MdLockReset className="size-5" />
                        </Button>
                    </form>
                </div>
            )}
        </section>
    );
}

export default ResetPassword;
