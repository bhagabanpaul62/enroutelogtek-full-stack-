import Image from 'next/image';
import { ArrowRight, CalendarDays } from 'lucide-react';

const highlights = [
    {
        title: 'CUSTOM ARCHITECTURE',
        description: 'Engineered around your verified supply chain topology.',
    },
    {
        title: 'DEDICATED ADVISORY',
        description: 'Direct logistics technical lead for configuration & onboarding.',
    },
];

export default function EnterprisePricingCTA() {
    return (
        <section className="relative overflow-hidden border-b border-[#292929] bg-[#0e0e0e] px-6 py-20 sm:py-24 lg:py-28">
            {/* Subtle ambient glow */}
            <div className="pointer-events-none absolute left-[35%] top-1/2 h-[420px] w-[600px] -translate-y-1/2 rounded-full bg-[#fbbc0e]/[0.025] blur-[140px]" />

            <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_0.95fr] lg:gap-14">
                {/* =====================================================
                    LEFT CONTENT
                ===================================================== */}
                <div>
                    {/* Eyebrow */}
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#fbbc0e]" />

                        <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#fbbc0e] sm:text-[11px]">
                            Enterprise Logistics Infrastructure
                        </p>
                    </div>

                    {/* Heading */}
                    <h2 className="mt-5 max-w-[650px] font-[var(--font-hanken)] text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-[#f1efed] sm:text-4xl lg:text-[38px]">
                        Running a complex logistics operation?
                    </h2>

                    {/* Description */}
                    <p className="mt-5 max-w-[620px] font-[var(--font-inter)] text-[15px] leading-6 text-[#d4c5ac] sm:text-[16px] sm:leading-7">
                        Talk with the Enroute team about a tailored configuration designed
                        specifically around your multi-facility network, proprietary operational
                        workflows, and high-frequency freight volumes.
                    </p>

                    {/* Highlights */}
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {highlights.map((item) => (
                            <div
                                key={item.title}
                                className="group rounded-md border border-[#292929] bg-[#111111] p-4 transition-all duration-300 hover:border-[#504532] hover:bg-[#151515]"
                            >
                                <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#fbbc0e]">
                                    {item.title}
                                </p>

                                <p className="mt-2 font-[var(--font-inter)] text-[12px] leading-5 text-[#68809f]">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <a
                            href="/support"
                            className="group inline-flex h-11 items-center justify-center gap-3 rounded bg-[#fbbc0e] px-6 font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.1em] text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffd88a] hover:shadow-[0_10px_30px_rgba(251,188,14,0.18)]"
                        >
                            <span>Contact Sales</span>

                            <ArrowRight
                                size={15}
                                strokeWidth={2}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </a>

                        <a
                            href="/support"
                            className="group inline-flex h-11 items-center justify-center gap-3 rounded border border-[#292929] bg-[#111111] px-6 font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.1em] text-[#e5e2e1] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#806b3d] hover:bg-[#171717] hover:text-[#ffd88a]"
                        >
                            <span>Book a Conversation</span>

                            <CalendarDays
                                size={14}
                                strokeWidth={1.8}
                                className="transition-transform duration-300 group-hover:scale-110"
                            />
                        </a>
                    </div>
                </div>

                {/* =====================================================
                    RIGHT IMAGE
                ===================================================== */}
                <div className="group relative">
                    {/* Image glow */}
                    <div className="pointer-events-none absolute -inset-2 rounded-lg bg-[#fbbc0e]/0 blur-xl transition-all duration-500 group-hover:bg-[#fbbc0e]/[0.10]" />

                    <div className="relative overflow-hidden rounded-lg border border-[#504532] bg-[#111111] transition-all duration-500 group-hover:-translate-y-1 group-hover:border-[#fbbc0e] group-hover:shadow-[0_0_40px_rgba(251,188,14,0.16)]">
                        {/* Image */}
                        <div className="relative aspect-[4/3] overflow-hidden">
                            <Image
                                src="/price_image.png"
                                alt="Enterprise logistics infrastructure"
                                fill
                                priority={false}
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                            />

                            {/* Image overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
