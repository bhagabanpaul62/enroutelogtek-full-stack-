import Image from 'next/image';
import Marquee from '@/shared/ui/components/home/Marquee';
import { Hanken_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { ArrowRight } from 'lucide-react';
import Stats from './Stats';

const hankenGrotesk = Hanken_Grotesk({
    subsets: ['latin'],
    variable: '--font-hanken',
});

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

const jetBrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
});

export default function Hero() {
    return (
        <section
            className={`${hankenGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable} relative min-h-screen overflow-hidden bg-black`}
        >
            {/* Background */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/heroBgImage.png')",
                }}
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/70" />

            {/* Hero Content */}
            <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 pb-48 pt-40">
                <div className="grid w-full items-center gap-12 lg:grid-cols-2">
                    {/* Left Content */}
                    <div className="max-w-2xl">
                        {/* Badge */}
                        <div className="mb-8 flex items-center gap-3">
                            <span className="flex items-center gap-2 rounded border border-[#292722] bg-[#111111] px-3 py-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#fbbc0e]" />

                                <span className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.12em] text-[#fbbc0e]">
                                    Next-Gen Logistics OS
                                </span>
                            </span>
                        </div>

                        {/* Heading */}
                        <h1 className="mt-7 font-[var(--font-hanken)] text-5xl font-bold leading-[0.98] tracking-[-0.03em] text-[#e5e2e1] sm:text-6xl lg:text-[60px]">
                            Transform Logistics
                            <br />
                            Procurement &
                            <br />
                            Freight Operations
                            <br />
                            with <span className="text-[#fbbc0e]">EnrouteLogTech</span>
                        </h1>

                        {/* Description */}
                        <p className="mt-7 max-w-xl font-[var(--font-inter)] text-base leading-6 text-[#d4c5ac]">
                            The enterprise-grade platform for shippers to digitize RFQs, automate
                            bidding, and optimize the entire freight lifecycle through real-time
                            intelligence.
                        </p>

                        {/* CTA */}
                        <div className="mt-9 flex flex-wrap items-center gap-4">
                            {/* Book a Demo */}
                            <a
                                href="/register"
                                className="group inline-flex items-center gap-3 rounded bg-[#fbbc0e] px-6 py-3 font-[var(--font-inter)] text-sm font-semibold text-black transition-all duration-300 hover:bg-[#ffd88a] hover:shadow-[0_0_25px_rgba(251,188,14,0.2)]"
                            >
                                <span>Book a Demo</span>

                                <ArrowRight
                                    size={17}
                                    strokeWidth={2}
                                    aria-hidden="true"
                                    className="transition-transform duration-300 group-hover:translate-x-1"
                                />
                            </a>

                            {/* View Platform */}
                            <a
                                href="#platform"
                                className="rounded border border-[#9c8f78] px-6 py-3 font-[var(--font-inter)] text-sm font-semibold text-[#e5e2e1] transition-all duration-300 hover:border-[#fbbc0e] hover:bg-[#171614] hover:text-[#ffd88a]"
                            >
                                View Platform
                            </a>
                        </div>
                    </div>

                    {/* Hero Image */}
                    <div className="relative hidden lg:block">
                        <div className="relative ml-auto aspect-[4/3] w-full max-w-[560px] overflow-hidden rounded-lg border border-[#222222]">
                            <Image
                                src="/heroImage.png"
                                alt="EnrouteLogTech logistics platform dashboard"
                                fill
                                priority
                                sizes="(max-width: 1024px) 0px, 560px"
                                className="object-cover"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Stats + Marquee */}
            <div className="absolute bottom-0 left-0 right-0 z-20">
                {/* Stats */}
                <div className="mx-auto max-w-7xl px-6">
                    <Stats />
                </div>

                {/* Marquee */}
                <Marquee />
            </div>
        </section>
    );
}
