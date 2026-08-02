'use client';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import React, { useState } from 'react';
import { FaArrowRight } from 'react-icons/fa6';
import { MdLockReset } from 'react-icons/md';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

function Login() {
    const [isPass, setPass] = useState(true);
    const { register, handleSubmit, reset } = useForm({});
    return (
        <section className="min-h-screen w-full bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-amber-100 flex justify-center items-center px-4 py-24 md:py-24">
            <div className=" flex flex-col justify-center items-center">
                <div className=" px-10 py-10 rounded-2xl sm:border border-white/12">
                    <div>
                        <div className="py-7">
                            {' '}
                            <h2 className="text-4xl font-bold">Reset Password</h2>
                            <p className="font-medium w-75 mt-5">
                                Create a new, strong password for your account.
                            </p>
                        </div>
                    </div>
                    <form action="">
                        <div className="relative">
                            <div className="flex justify-between">
                                <label className="font-medium " htmlFor="email">
                                    New Password
                                </label>
                            </div>
                            <Input
                                type={isPass ? 'password' : 'text'}
                                className="h-10 mt-2 border border-white/10 placeholder:text-neutral-400"
                                placeholder="Enter a strong password"
                            />
                            <button
                                className="absolute top-11 right-3  z-10"
                                type="button"
                                onClick={() => setPass(!isPass)}
                            >
                                {isPass === true ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        <div className="relative mt-3">
                            <div className="flex justify-between">
                                <label className="font-medium " htmlFor="email">
                                    Confirm New Password
                                </label>
                            </div>
                            <Input
                                type={isPass ? 'password' : 'text'}
                                className="h-10 mt-2 border border-white/10 placeholder:text-neutral-400"
                                placeholder="Enter a strong password"
                            />
                            <button
                                className="absolute top-11 right-3  z-10"
                                type="button"
                                onClick={() => setPass(!isPass)}
                            >
                                {isPass === true ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>

                        <Button className="flex mx-auto font-bold w-full py-7 text-lg  mt-10">
                            Reset Password <MdLockReset className="size-7" />
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
