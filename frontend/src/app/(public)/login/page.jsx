'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { FaArrowRight } from 'react-icons/fa6';

import { Link } from 'next-view-transitions';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

import { useLogin } from '@/hooks/auth/useLogin';

function Login() {
    const [isPass, setPass] = useState(true);

    const { register, handleSubmit, errors, isSubmitting, apiError, onSubmit } = useLogin();

    return (
        <section className="min-h-screen w-full bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-amber-100 flex justify-center items-center px-4 py-24 md:py-24">
            <div className=" flex flex-col justify-center items-center">
                <div className=" px-10 py-10 rounded-2xl sm:border border-white/12">
                    <div>
                        <div className="py-7">
                            {' '}
                            <h2 className="text-4xl font-bold">Welcome back</h2>
                            <p className="font-medium w-75">
                                Enter your password to access your logistics dashboard.
                            </p>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <label className="font-medium " htmlFor="email">
                            Email Address
                        </label>
                        <Input
                            className="h-10 mt-2 mb-3 border border-white/10 placeholder:text-neutral-400"
                            placeholder="name@company.com"
                            {...register('email', {
                                required: 'Email is required',
                                pattern: {
                                    value: /^\S+@\S+\.\S+$/,
                                    message: 'Invalid email',
                                },
                            })}
                        />
                        {errors.email && (
                            <p className="text-red-500 text-sm -mt-2 mb-2">
                                {errors.email.message}
                            </p>
                        )}
                        <div className="relative">
                            <div className="flex justify-between">
                                <label className="font-medium " htmlFor="email">
                                    Password
                                </label>
                                <Link className="font-medium" href={'/forgot-password'}>
                                    Forgot Password ?
                                </Link>
                            </div>
                            <Input
                                type={isPass ? 'password' : 'text'}
                                className="h-10 mt-2 border border-white/10 placeholder:text-neutral-400"
                                placeholder="Enter a strong password"
                                {...register('password', {
                                    required: 'password is required',
                                })}
                            />
                            <button
                                className="absolute top-11 right-3  z-10"
                                type="button"
                                onClick={() => setPass(!isPass)}
                            >
                                {isPass === true ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        <Button
                            type="submit"
                            className="flex mx-auto font-bold w-full py-7 text-lg  mt-15"
                        >
                            {isSubmitting ? (
                                <AiOutlineLoading3Quarters className=" !w-8 !h-8 !font-bold  animate-spin" />
                            ) : (
                                <>
                                    Login <FaArrowRight />{' '}
                                </>
                            )}
                        </Button>
                    </form>
                    <div className="flex justify-center py-10">
                        <p className="font-medium text-sm">
                            Don't have an account?{' '}
                            <Link href={'/register'} className="font-bold text-md">
                                Register
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Login;
