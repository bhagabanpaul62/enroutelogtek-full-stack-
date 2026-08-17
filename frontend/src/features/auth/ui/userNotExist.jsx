'use client';

import React from 'react';
import Link from 'next/link';
import { FaArrowRight, FaBuilding, FaUserPlus } from 'react-icons/fa6';
import { MdOutlineErrorOutline } from 'react-icons/md';

import { Button } from '@/shared/ui/primitives/button';

function UserNotExist({ email }) {
    return (
        <section className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-4 py-12 text-amber-100">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/60 p-6 shadow-2xl backdrop-blur-md sm:p-8">
                {/* Status Icon */}
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-amber-100/20 bg-amber-100/10 text-amber-100">
                    <MdOutlineErrorOutline className="size-8" />
                </div>

                {/* Header */}
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-amber-100 sm:text-4xl">
                        Account Not Found
                    </h2>
                    <p className="mt-3 text-sm font-medium text-amber-100/80">
                        No account exists for{' '}
                        <span className="font-semibold text-amber-100 underline decoration-amber-100/40">
                            {email}
                        </span>
                        .
                    </p>
                    <p className="mt-1 text-xs text-amber-100/60">
                        Please create an account or contact your organization admin for access.
                    </p>
                </div>

                {/* Action Options */}
                <div className="space-y-4">
                    {/* Option 1: Create Account */}
                    <Link href="/register" className="block">
                        <Button
                            type="button"
                            className="flex h-12 w-full items-center justify-between gap-2 px-5 text-base font-semibold text-amber-100 transition-all hover:opacity-90"
                        >
                            <span className="flex items-center gap-2.5">
                                <FaUserPlus className="size-4" />
                                Create New Account
                            </span>
                            <FaArrowRight className="size-4 opacity-80" />
                        </Button>
                    </Link>

                    
                </div>

                {/* Footer Link */}
                <div className="mt-8 text-center text-xs font-medium text-amber-100/60">
                    Want to try a different email?{' '}
                    <Link href="/login" className="text-amber-100 underline hover:text-amber-200">
                        Back to Sign In
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default UserNotExist;
