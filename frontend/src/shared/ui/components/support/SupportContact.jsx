import { Building2, GitBranch, TriangleAlert } from 'lucide-react';

import SupportContactForm from './SupportContactForm';

const supportPoints = [
    {
        icon: Building2,
        title: 'Enterprise Verification',
        description: 'Inquiries handled per corporate hierarchy',
    },
    {
        icon: GitBranch,
        title: 'Workflow Routing',
        description: 'Direct routing to operations specialists',
    },
];

export default function SupportContact() {
    return (
        <section className="relative overflow-hidden border-b border-[#222222] bg-black px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-[#292929] bg-[#111111] lg:grid-cols-[0.9fr_1.1fr]">
                    {/* =================================================
                        LEFT INFORMATION PANEL
                        ================================================= */}
                    <div className="flex flex-col border-b border-[#292929] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
                        {/* Label */}
                        <div className="flex items-center gap-3">
                            <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#fbbc0e]">
                                Contact
                            </span>

                            <span className="h-px w-7 bg-[#504532]" />
                        </div>

                        {/* Heading */}
                        <h2 className="mt-4 max-w-[430px] font-[var(--font-hanken)] text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-[#f1efed] sm:text-4xl">
                            Can&apos;t find what you&apos;re looking for?
                        </h2>

                        {/* Description */}
                        <p className="mt-5 max-w-[450px] font-[var(--font-inter)] text-[15px] leading-6 text-[#d4c5ac]">
                            Tell us what you&apos;re trying to accomplish and we&apos;ll help you
                            find the right next step.
                        </p>

                        {/* Support Points */}
                        <div className="mt-8 border-t border-[#292929] pt-6">
                            <div className="space-y-6">
                                {supportPoints.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <div key={item.title} className="flex items-start gap-4">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-[#292929] bg-[#0e0e0e]">
                                                <Icon
                                                    size={15}
                                                    strokeWidth={1.8}
                                                    className="text-[#fbbc0e]"
                                                />
                                            </div>

                                            <div>
                                                <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#e5e2e1]">
                                                    {item.title}
                                                </p>

                                                <p className="mt-1 font-[var(--font-inter)] text-[12px] leading-5 text-[#526681]">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Operational Issue */}
                        <div className="mt-auto pt-10">
                            <div className="rounded-md border border-[#292929] bg-[#0e0e0e] p-4">
                                <div className="flex items-start gap-3">
                                    <TriangleAlert
                                        size={16}
                                        strokeWidth={1.8}
                                        className="mt-0.5 shrink-0 text-red-500"
                                    />

                                    <div>
                                        <p className="font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.08em] text-red-500">
                                            Operational Issue?
                                        </p>

                                        <p className="mt-1 font-[var(--font-inter)] text-[12px] leading-4 text-[#d4c5ac]">
                                            Something is affecting an active shipment or trip?
                                            Select your Business Type and specify &quot;Active
                                            Trip&quot; in the subject.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* =================================================
                        RIGHT FORM
                    ================================================= */}
                    <SupportContactForm />
                </div>
            </div>
        </section>
    );
}
