'use client';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import React from 'react';
import { FaArrowRight } from 'react-icons/fa6';
import { Link } from 'next-view-transitions';
import { useSendOtp } from '@/features/auth/hooks/useSendOtp';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

function Register() {
    const { register, onSubmit, apiError, errors, handleSubmit, isSubmitting } = useSendOtp();
    return (
        <section className="min-h-screen w-full bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-amber-100 flex justify-center items-center px-4 py-24 md:py-24">
            <div className=" flex flex-col justify-center items-center">
                <div className=" px-10 py-10 rounded-2xl sm:border border-white/12">
                    <div>
                        <div className="py-7">
                            {' '}
                            <h2 className="text-4xl font-bold">Welcome back</h2>
                            <p className="font-medium w-75 mt-5">
                                Enter your credentials to access your dashboard.
                            </p>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <label className="font-medium " htmlFor="email">
                            Email Address
                        </label>
                        <Input
                            {...register('email', {
                                required: 'Email is required',
                                pattern: {
                                    value: /^\S+@\S+\.\S+$/,
                                    message: 'Invalid email',
                                },
                            })}
                            className="h-10 mt-2 border border-white/10 placeholder:text-neutral-400"
                            placeholder="name@company.com"
                        />
                        <p className="text-[10px] mt-2">
                            We'll send a secure one-time passcode to this email.
                        </p>
                        {errors.email && (
                            <p className="text-red-500 text-sm -mt-1 mb-2">
                                {errors.email.message}
                            </p>
                        )}
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
                                    Register <FaArrowRight />{' '}
                                </>
                            )}
                        </Button>
                    </form>
                    <div className="flex justify-center py-10">
                        <p className="font-medium text-sm">
                            Have an account already?{' '}
                            <Link href={'/login'} className="font-bold text-md">
                                Log in.
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Register;
