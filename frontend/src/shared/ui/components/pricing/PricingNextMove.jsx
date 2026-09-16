import { ArrowRight, Headset } from 'lucide-react';

export default function PricingNextMove() {
    return (
        <section className="relative overflow-hidden border-b border-[#292929] bg-[#0e0e0e] px-6 py-20 sm:py-24 lg:py-28">
            {/* Ambient Glow */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fbbc0e]/[0.025] blur-[140px]" />

            <div className="relative mx-auto max-w-5xl text-center">
                {/* Eyebrow */}
                <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#fbbc0e] sm:text-[11px]">
                    Next Move // Operational Elevation
                </p>

                {/* Heading */}
                <h2 className="mx-auto mt-5 max-w-[850px] font-[var(--font-hanken)] text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-[#f1efed] sm:text-5xl lg:text-[46px]">
                    The right platform should move with
                    <br className="hidden sm:block" />
                    your business.
                </h2>

                {/* Description */}
                <p className="mx-auto mt-7 max-w-[700px] font-[var(--font-inter)] text-[15px] leading-6 text-[#d4c5ac] sm:text-[16px] sm:leading-7">
                    Start building a more connected logistics operation with Enroute. Connect with
                    verified partners, streamline RFQs, and coordinate fleet capacity.
                </p>

                {/* CTA Buttons */}
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    {/* Get Started */}
                    <a
                        href="/register"
                        className="group inline-flex h-11 min-w-[150px] items-center justify-center gap-3 rounded bg-[#fbbc0e] px-6 font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.1em] text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffd88a] hover:shadow-[0_10px_30px_rgba(251,188,14,0.18)]"
                    >
                        <span>Get Started</span>

                        <ArrowRight
                            size={15}
                            strokeWidth={2}
                            className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                    </a>

                    {/* Talk to Sales */}
                    <a
                        href="/support"
                        className="group inline-flex h-11 min-w-[166px] items-center justify-center gap-3 rounded border border-[#292929] bg-[#111111] px-6 font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.1em] text-[#e5e2e1] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#806b3d] hover:bg-[#171717] hover:text-[#ffd88a]"
                    >
                        <span>Talk to Sales</span>

                        <Headset
                            size={14}
                            strokeWidth={1.8}
                            className="transition-transform duration-300 group-hover:scale-110"
                        />
                    </a>
                </div>
            </div>
        </section>
    );
}
