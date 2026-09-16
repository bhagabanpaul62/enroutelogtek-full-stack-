import { ArrowRight, Headset } from 'lucide-react';

export default function PricingHero() {
    return (
        <section className="relative overflow-hidden border-b border-[#222222] bg-black px-6 pb-20 pt-24 sm:pb-24 sm:pt-28 lg:pb-24 lg:pt-28">
            {/* Ambient Glow */}
            <div className="pointer-events-none absolute left-1/2 top-[45%] h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fbbc0e]/[0.025] blur-[150px]" />

            {/* Main Content */}
            <div className="relative mx-auto max-w-6xl text-center">
                {/* Technical Label */}
                <div className="inline-flex items-center gap-2 rounded border border-[#292929] bg-[#111111] px-4 py-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#fbbc0e]" />

                    <span className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.15em] text-[#68809f]">
                        Pricing / Enroute LogTek / Config 2026
                    </span>
                </div>

                {/* Main Heading */}
                <h1 className="mx-auto mt-8 max-w-5xl font-[var(--font-hanken)] text-[46px] font-bold leading-[1.02] tracking-[-0.035em] text-[#f1efed] sm:text-[54px] lg:text-[58px]">
                    Pricing built around
                    <br />
                    your <span className="text-[#fbbc0e]">operation.</span>
                </h1>

                {/* Description */}
                <p className="mx-auto mt-7 max-w-[720px] font-[var(--font-inter)] text-[17px] font-normal leading-7 text-[#d4c5ac] sm:text-[18px] sm:leading-7">
                    Choose the Enroute solution that fits the way your business moves. Whether you
                    manage transportation demand, provide capacity, coordinate logistics, or operate
                    a fleet, Enroute is designed to scale with your business.
                </p>

                {/* CTA Buttons */}
                <div className="mt-9 flex items-center justify-center gap-4">
                    {/* Get Started */}
                    <a
                        href="/register"
                        className="group inline-flex h-13 items-center gap-3 rounded bg-[#fbbc0e] px-7 font-[var(--font-inter)] text-sm font-semibold text-black transition-all duration-300 hover:bg-[#ffd88a] hover:shadow-[0_0_25px_rgba(251,188,14,0.2)]"
                    >
                        <span>Get Started</span>

                        <ArrowRight
                            size={16}
                            strokeWidth={2}
                            className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                    </a>

                    {/* Talk To Sales */}
                    <a
                        href="/support"
                        className="group inline-flex h-13 items-center gap-3 rounded border border-[#292929] bg-[#111111] px-7 font-[var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#e5e2e1] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#806b3d] hover:bg-[#171614] hover:text-[#ffd88a]"
                    >
                        <span>Talk to Sales</span>

                        <Headset
                            size={15}
                            strokeWidth={1.8}
                            className="transition-transform duration-300 group-hover:scale-110"
                        />
                    </a>
                </div>

                {/* Configuration Bar */}
                <div className="mx-auto mt-11 flex max-w-[925px] items-center justify-center overflow-hidden rounded border border-[#292929] bg-[#111111]">
                    {/* Role Based */}
                    <div className="flex flex-1 items-center justify-center gap-2 px-5 py-3.5">
                        <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#fbbc0e]">
                            Role-Based:
                        </span>

                        <span className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[#68809f]">
                            4 Dedicated Models
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="h-5 w-px bg-[#292929]" />

                    {/* Pricing */}
                    <div className="flex flex-1 items-center justify-center gap-2 px-5 py-3.5">
                        <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#fbbc0e]">
                            Pricing:
                        </span>

                        <span className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[#68809f]">
                            Tailored & Scalable
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="h-5 w-px bg-[#292929]" />

                    {/* Infrastructure */}
                    <div className="flex flex-1 items-center justify-center gap-2 px-5 py-3.5">
                        <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#fbbc0e]">
                            Infrastructure:
                        </span>

                        <span className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[#68809f]">
                            Zero Disconnected Modules
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
