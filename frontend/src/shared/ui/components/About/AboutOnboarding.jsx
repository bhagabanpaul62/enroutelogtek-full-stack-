import { ArrowRight } from 'lucide-react';

export default function AboutOnboarding() {
    return (
        <section className="border-b border-[#222222] bg-black px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                <div className="group relative overflow-hidden rounded-lg border border-[#292929] bg-[#111111] px-7 py-14 shadow-[0_0_30px_rgba(251,188,14,0.06)] sm:px-12 sm:py-16 lg:px-14 lg:py-16">
                    {/* =================================================
                        SUBTLE BORDER GLOW
                    ================================================== */}
                    <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-[#806b3d]/20 transition-all duration-500 group-hover:ring-[#fbbc0e]/30" />

                    {/* =================================================
                        BACKGROUND CIRCLES
                    ================================================== */}
                    <div className="pointer-events-none absolute -right-20 -bottom-36 h-[380px] w-[380px] rounded-full border border-[#806b3d]/30" />

                    <div className="pointer-events-none absolute -right-8 -bottom-24 h-[260px] w-[260px] rounded-full border border-[#806b3d]/35" />

                    {/* Soft ambient glow */}
                    <div className="pointer-events-none absolute right-[-80px] bottom-[-100px] h-[300px] w-[300px] rounded-full bg-[#fbbc0e]/[0.025] blur-[70px]" />

                    {/* =================================================
                        CONTENT
                    ================================================== */}
                    <div className="relative z-10 max-w-[760px]">
                        {/* Label */}
                        <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#fbbc0e] sm:text-[11px]">
                            System Onboarding
                        </p>

                        {/* Heading */}
                        <h2 className="mt-4 max-w-[720px] font-[var(--font-hanken)] text-[40px] font-bold leading-[1.05] tracking-[-0.035em] text-[#f1efed] sm:text-[48px] lg:text-[50px]">
                            Build the future of connected logistics.
                        </h2>

                        {/* Description */}
                        <p className="mt-5 max-w-[790px] font-[var(--font-inter)] text-[15px] leading-6 text-[#d4c5ac] sm:text-[16px] sm:leading-7">
                            Whether you are an enterprise shipper, an expanding carrier, a regional
                            freight broker, or a commercial fleet asset owner—connect your
                            operations to Enroute.
                        </p>

                        {/* Buttons */}
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                            {/* Get Started */}
                            <a
                                href="/register"
                                className="group/primary inline-flex h-12 items-center justify-center gap-3 rounded bg-[#fbbc0e] px-7 font-[var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.1em] text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffd88a] hover:shadow-[0_10px_30px_rgba(251,188,14,0.2)]"
                            >
                                <span>Get Started</span>

                                <ArrowRight
                                    size={15}
                                    strokeWidth={2}
                                    className="transition-transform duration-300 group-hover/primary:translate-x-1"
                                />
                            </a>

                            {/* Explore Solutions */}
                            <a
                                href="/solution"
                                className="inline-flex h-12 items-center justify-center gap-3 rounded border border-[#292929] bg-[#111111] px-7 font-[var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#e5e2e1] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#806b3d] hover:bg-[#171614] hover:text-[#ffd88a]"
                            >
                                Explore Solutions
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
