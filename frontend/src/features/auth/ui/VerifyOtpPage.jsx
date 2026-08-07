'use client';
import { Button } from '@/shared/ui/primitives/button';
import React, { useEffect, useState } from 'react';
import { FaArrowRight } from 'react-icons/fa6';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/shared/ui/primitives/input-otp';
import { useVerifyOtp } from '@/features/auth/hooks/useVerifyOtp';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { Controller } from 'react-hook-form';
import { useRegistrationFlow } from '@/features/auth/hooks/useRegistrationFlow';
import { sendOtpApi } from '@/features/auth/api/auth.api';
import { useResendOtp } from '@/features/auth/hooks/useResendOtp';

function VerifyOtp() {
    const { isAllow, loading } = useRegistrationFlow();
    const { control, handleSubmit, errors, isSubmitting, apiError, onSubmit , email} = useVerifyOtp();
    const { handelResendOtp, count } = useResendOtp();

    if (!isAllow) {
        return null;
    }

    return (
        <section className="py-24 md:py-40 text-amber-100 ">
            <div className=" flex flex-col justify-center items-center">
                <div className="w-90 md:w-fit  md:px-10 md:py-10 rounded-2xl sm:border border-white/12 overflow-clip">
                    <div>
                        <div className="py-7">
                            <h2 className="text-2xl font-bold mb-3">Verify Identity</h2>
                            <p className="font-medium w-95">
                                We've sent a 6-digit verification code to {email} Please enter it
                                below to continue.
                            </p>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="flex justify-center items-center">
                            <Controller
                                name="otp"
                                rules={{
                                    required: 'OTP is required',
                                    minLength: { value: 6, message: 'Enter all 6 digits' },
                                }}
                                control={control}
                                render={({ field }) => (
                                    <InputOTP
                                        className=" py-10"
                                        maxLength={6}
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        autoFocus={true}
                                    >
                                        <InputOTPGroup className="flex gap-2 py-8 ">
                                            <InputOTPSlot
                                                className="w-12 h-12 md:w-15 md:h-15 border border-white/20 rounded-2xl md:text-3xl font-medium "
                                                index={0}
                                            />
                                            <InputOTPSlot
                                                className="w-12 h-12 md:w-15 md:h-15  border border-white/20 rounded-2xl md:text-3xl font-medium "
                                                index={1}
                                            />
                                            <InputOTPSlot
                                                className="w-12 h-12 md:w-15 md:h-15  border border-white/20 rounded-2xl md:text-3xl font-medium "
                                                index={2}
                                            />
                                            <InputOTPSlot
                                                className="w-12 h-12 md:w-15 md:h-15  border border-white/20 rounded-2xl md:text-3xl font-medium "
                                                index={3}
                                            />
                                            <InputOTPSlot
                                                className="w-12 h-12 md:w-15 md:h-15  border border-white/20 rounded-2xl md:text-3xl font-medium "
                                                index={4}
                                            />
                                            <InputOTPSlot
                                                className="w-12 h-12 md:w-15 md:h-15  border border-white/20 rounded-2xl md:text-3xl font-medium "
                                                index={5}
                                            />
                                        </InputOTPGroup>
                                    </InputOTP>
                                )}
                            />
                        </div>

                        {errors.otp && (
                            <p className="text-red-500 text-sm -mt-6 mb-2">{errors.otp?.message}</p>
                        )}
                        {apiError && <p className="text-red-500 text-sm -mt-6 mb-2">{apiError}</p>}
                        <div className="flex justify-between font-bold ">
                            <p>
                                Expires in: <span className="text-red-600">10 minutes</span>{' '}
                            </p>
                            {count > 0 ? (
                                <span className="text-amber-100/50">Resend OTP in {count}s</span>
                            ) : (
                                <button
                                    type="button"
                                    className="cursor-pointer hover:"
                                    onClick={handelResendOtp}
                                >
                                    Resend OTP
                                </button>
                            )}
                        </div>
                        <Button
                            type="submit"
                            className="flex mx-auto font-bold w-full py-7 text-lg  mt-15"
                        >
                            {isSubmitting ? (
                                <AiOutlineLoading3Quarters
                                    size={40}
                                    className="  !w-8 !h-8 !font-bold animate-spin"
                                />
                            ) : (
                                <>
                                    Verify Identity <FaArrowRight />{' '}
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </section>
    );
}

export default VerifyOtp;
