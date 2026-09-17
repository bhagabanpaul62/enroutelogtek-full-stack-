import Image from 'next/image';
import { ArrowRight, ExternalLink } from 'lucide-react';

export default function AboutHero() {
    return (
        <section className="relative min-h-[720px] overflow-hidden border-b border-[#222222] bg-black sm:min-h-[760px]">
            {/* =====================================================
                HERO BACKGROUND IMAGE
                ===================================================== */}
            <Image
                src="/About_HeroImage.png"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
            />

            {/* =====================================================
                LIGHT DARK OVERLAY
                ===================================================== */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Left-side readability gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />

            {/* Bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* =====================================================
                HERO CONTENT
                ===================================================== */}
            <div className="relative z-10 mx-auto flex min-h-[720px] max-w-6xl items-center px-6 py-24 sm:min-h-[760px] sm:py-28">
                <div className="max-w-[700px]">
                    {/* Technical Label */}
                    <div className="inline-flex items-center gap-2 rounded border border-[#504532]/70 bg-[#0e0e0e]/70 px-3 py-2 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#fbbc0e]" />

                        <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#fbbc0e] sm:text-[11px]">
                            About Enroute LogTek
                        </span>

                        <span className="text-[#806b3d]">|</span>

                        <span className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.1em] text-[#68809f]">
                            ENR-SYS-01
                        </span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="mt-7 max-w-[680px] font-[var(--font-hanken)] text-[44px] font-bold leading-[1.02] tracking-[-0.035em] text-white sm:text-[52px] lg:text-[60px]">
                        The technology behind
                        <br />
                        every move.
                    </h1>

                    {/* Supporting Heading */}
                    <h2 className="mt-5 max-w-[650px] font-[var(--font-inter)] text-[17px] font-semibold leading-6 text-[#ffd35c] sm:text-[18px]">
                        Built for the businesses that keep logistics moving.
                    </h2>

                    {/* Description */}
                    <p className="mt-4 max-w-[650px] font-[var(--font-inter)] text-[14px] leading-6 text-[#f1efed] sm:text-[15px] sm:leading-7">
                        Enroute is building a connected B2B logistics ecosystem where customers,
                        transporters, brokers, and fleet owners can build relationships, discover
                        opportunities, and manage transportation through one connected platform.
                    </p>

                    {/* CTA Buttons */}
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        {/* Get Started */}
                        <a
                            href="/register"
                            className="group inline-flex h-12 items-center justify-center gap-3 rounded bg-[#fbbc0e] px-7 font-[var(--font-inter)] text-[14px] font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffd88a] hover:shadow-[0_10px_30px_rgba(251,188,14,0.2)]"
                        >
                            <span>Get Started</span>

                            <ArrowRight
                                size={17}
                                strokeWidth={2}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </a>

                        {/* Explore Platform */}
                        <a
                            href="/"
                            className="group inline-flex h-12 items-center justify-center gap-3 rounded border border-[#504532] bg-[#111111]/80 px-7 font-[var(--font-inter)] text-[14px] font-semibold text-[#e5e2e1] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#fbbc0e] hover:bg-[#171717] hover:text-[#ffd88a]"
                        >
                            <span>Explore the Platform</span>

                            <ExternalLink
                                size={16}
                                strokeWidth={1.8}
                                className="transition-transform duration-300 group-hover:scale-110"
                            />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
