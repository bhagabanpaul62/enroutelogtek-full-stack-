'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';

const businessTypes = [
    'Customer (Industrial Shipper / Manufacturer)',
    'Transporter (Carrier)',
    'Broker (Logistics Coordinator)',
    'Fleet Owner (Asset Operator)',
];

export default function SupportContactForm() {
    const [submitted, setSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        mode: 'onBlur',
        defaultValues: {
            fullName: '',
            workEmail: '',
            businessType: '',
            subject: '',
            message: '',
        },
    });

    const onSubmit = async (data) => {
        console.log('Support request:', data);

        // Temporary submit handling.
        // Replace this with your API request later.
        await new Promise((resolve) => setTimeout(resolve, 700));

        setSubmitted(true);
        reset();
    };

    return (
        <div className="p-6 sm:p-8 lg:p-10">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {/* =====================================================
                    FULL NAME
                ===================================================== */}
                <div>
                    <label
                        htmlFor="fullName"
                        className="mb-2 block font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#e5e2e1]"
                    >
                        Full Name
                    </label>

                    <input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        className={`h-10 w-full rounded border bg-[#050505] px-3 font-[var(--font-inter)] text-[12px] text-[#e5e2e1] outline-none transition-all duration-300 placeholder:text-[#526681] ${
                            errors.fullName
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-[#292929] focus:border-[#fbbc0e]'
                        }`}
                        {...register('fullName', {
                            required: 'Full name is required.',
                            minLength: {
                                value: 2,
                                message: 'Full name must contain at least 2 characters.',
                            },
                            maxLength: {
                                value: 80,
                                message: 'Full name cannot exceed 80 characters.',
                            },
                            pattern: {
                                value: /^[A-Za-zÀ-ÿ\s.'-]+$/,
                                message: 'Please enter a valid name.',
                            },
                        })}
                    />

                    {errors.fullName && (
                        <p className="mt-1.5 font-[var(--font-inter)] text-[10px] text-red-400">
                            {errors.fullName.message}
                        </p>
                    )}
                </div>

                {/* =====================================================
                    WORK EMAIL
                ===================================================== */}
                <div>
                    <label
                        htmlFor="workEmail"
                        className="mb-2 block font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#e5e2e1]"
                    >
                        Work Email
                    </label>

                    <input
                        id="workEmail"
                        type="email"
                        placeholder="name@company.com"
                        className={`h-10 w-full rounded border bg-[#050505] px-3 font-[var(--font-inter)] text-[12px] text-[#e5e2e1] outline-none transition-all duration-300 placeholder:text-[#526681] ${
                            errors.workEmail
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-[#292929] focus:border-[#fbbc0e]'
                        }`}
                        {...register('workEmail', {
                            required: 'Work email is required.',
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Please enter a valid email address.',
                            },
                        })}
                    />

                    {errors.workEmail && (
                        <p className="mt-1.5 font-[var(--font-inter)] text-[10px] text-red-400">
                            {errors.workEmail.message}
                        </p>
                    )}
                </div>

                {/* =====================================================
                    BUSINESS TYPE
                ===================================================== */}
                <div>
                    <label
                        htmlFor="businessType"
                        className="mb-2 block font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#e5e2e1]"
                    >
                        Business Type
                    </label>

                    <select
                        id="businessType"
                        className={`h-10 w-full cursor-pointer rounded border bg-[#050505] px-3 font-[var(--font-inter)] text-[12px] text-[#e5e2e1] outline-none transition-all duration-300 ${
                            errors.businessType
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-[#fbbc0e] focus:border-[#ffd88a]'
                        }`}
                        {...register('businessType', {
                            required: 'Please select your business type.',
                        })}
                    >
                        <option value="" disabled>
                            Select your business type
                        </option>

                        {businessTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>

                    {errors.businessType && (
                        <p className="mt-1.5 font-[var(--font-inter)] text-[10px] text-red-400">
                            {errors.businessType.message}
                        </p>
                    )}
                </div>

                {/* =====================================================
                    SUBJECT
                ===================================================== */}
                <div>
                    <label
                        htmlFor="subject"
                        className="mb-2 block font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#e5e2e1]"
                    >
                        Subject
                    </label>

                    <input
                        id="subject"
                        type="text"
                        placeholder="Brief summary of your inquiry"
                        className={`h-10 w-full rounded border bg-[#050505] px-3 font-[var(--font-inter)] text-[12px] text-[#e5e2e1] outline-none transition-all duration-300 placeholder:text-[#526681] ${
                            errors.subject
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-[#292929] focus:border-[#fbbc0e]'
                        }`}
                        {...register('subject', {
                            required: 'Subject is required.',
                            minLength: {
                                value: 5,
                                message: 'Subject must contain at least 5 characters.',
                            },
                            maxLength: {
                                value: 120,
                                message: 'Subject cannot exceed 120 characters.',
                            },
                        })}
                    />

                    {errors.subject && (
                        <p className="mt-1.5 font-[var(--font-inter)] text-[10px] text-red-400">
                            {errors.subject.message}
                        </p>
                    )}
                </div>

                {/* =====================================================
                    MESSAGE
                    ===================================================== */}
                <div>
                    <label
                        htmlFor="message"
                        className="mb-2 block font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#e5e2e1]"
                    >
                        Message
                    </label>

                    <textarea
                        id="message"
                        rows={4}
                        placeholder="Describe your inquiry, affected reference ID, or what you're trying to accomplish..."
                        className={`w-full resize-none rounded border bg-[#050505] px-3 py-3 font-[var(--font-inter)] text-[12px] leading-5 text-[#e5e2e1] outline-none transition-all duration-300 placeholder:text-[#526681] ${
                            errors.message
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-[#292929] focus:border-[#fbbc0e]'
                        }`}
                        {...register('message', {
                            required: 'Message is required.',
                            minLength: {
                                value: 20,
                                message: 'Message must contain at least 20 characters.',
                            },
                            maxLength: {
                                value: 2000,
                                message: 'Message cannot exceed 2000 characters.',
                            },
                        })}
                    />

                    {errors.message && (
                        <p className="mt-1.5 font-[var(--font-inter)] text-[10px] text-red-400">
                            {errors.message.message}
                        </p>
                    )}
                </div>

                {/* =====================================================
                    SUBMIT
                    ===================================================== */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group flex h-11 w-full items-center justify-center gap-2 rounded bg-[#fbbc0e] px-5 font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.1em] text-black transition-all duration-300 hover:bg-[#ffd88a] hover:shadow-[0_10px_30px_rgba(251,188,14,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <span>{isSubmitting ? 'Sending Request...' : 'Send Request'}</span>

                    <Send
                        size={14}
                        strokeWidth={1.9}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                </button>

                {/* Success Message */}
                {submitted && (
                    <div className="rounded border border-[#504532] bg-[#0e0e0e] px-4 py-3">
                        <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.06em] text-[#fbbc0e]">
                            Request submitted successfully.
                        </p>

                        <p className="mt-1 font-[var(--font-inter)] text-[12px] leading-5 text-[#68809f]">
                            The Enroute support team can review your request and follow up with the
                            appropriate next step.
                        </p>
                    </div>
                )}

                {/* Footer Note */}
                {!submitted && (
                    <p className="font-[var(--font-mono)] text-[12px] leading-4 text-[#526681]">
                        For faster assistance, include your business type and a clear description of
                        the issue.
                    </p>
                )}
            </form>
        </div>
    );
}
