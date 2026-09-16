import { ArrowRight, Headset } from 'lucide-react';

export default function OnboardingCTA() {
    return (
        <section className="relative overflow-hidden border-t border-[#222222] bg-[#131313] px-6 py-24 sm:py-28 lg:py-32">
            {/* Ambient Background Glow */}

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fbbc0e]/[0.025] blur-[120px]" />

            <div className="relative mx-auto max-w-5xl text-center">
                {/* Eyebrow */}

                <p className="font-[var(--font-mono)] text-[12px] font-medium uppercase tracking-[0.18em] text-[#fbbc0e]">
                    Begin Onboarding
                </p>

                {/* Heading */}

                <h2 className="mx-auto mt-5 max-w-4xl font-[var(--font-hanken)] text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-[#e5e2e1] sm:text-5xl lg:text-[52px] lg:leading-[1.05]">
                    Build your logistics network with
                    <br className="hidden sm:block" /> Enroute.
                </h2>

                {/* Description */}

                <p className="mx-auto mt-7 max-w-2xl font-[var(--font-inter)] text-base leading-6 text-[#d4c5ac] sm:text-[17px] sm:leading-7">
                    Connect with the businesses that keep transportation moving and manage the
                    journey from opportunity to execution.
                </p>

                {/* CTA Buttons */}

                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                    {/* Primary CTA */}

                    <a
                        href="/register"
                        className="group inline-flex h-13 items-center justify-center gap-3 rounded bg-[#fbbc0e] px-7 font-[var(--font-inter)] text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffd88a] hover:shadow-[0_10px_30px_rgba(251,188,14,0.18)]"
                    >
                        <span>Get Started</span>

                        <ArrowRight
                            size={16}
                            strokeWidth={2}
                            className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                    </a>

                    {/* Secondary CTA */}

                    <a
                        href="/support"
                        className="group inline-flex h-13 items-center justify-center gap-3 rounded border border-[#292929] bg-[#111111] px-7 font-[var(--font-inter)] text-sm font-medium text-[#e5e2e1] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#806b3d] hover:bg-[#171614] hover:text-[#ffd88a] hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                    >
                        <span>Talk to Enroute</span>

                        <Headset
                            size={15}
                            strokeWidth={1.8}
                            className="transition-transform duration-300 group-hover:scale-110"
                        />
                    </a>
                </div>

                {/* Technical Footer Label */}

                <div className="mt-11 flex items-center justify-center gap-5">
                    <span className="font-[var(--font-mono)] text-[8px] font-medium uppercase tracking-[0.1em] text-[#4f6280] sm:text-[9px]">
                        Enroute LogTek Platform
                    </span>

                    <span className="h-1 w-1 rounded-full bg-[#504532]" />

                    <span className="font-[var(--font-mono)] text-[8px] font-medium uppercase tracking-[0.1em] text-[#4f6280] sm:text-[9px]">
                        Enterprise Onboarding
                    </span>
                </div>
            </div>
        </section>
    );
}
