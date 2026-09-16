import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import Image from 'next/image';

export default function SolutionHero() {
    return (
        <section className="relative overflow-hidden bg-black px-6 pb-24 pt-24 sm:pb-28 sm:pt-28">
            {/* Subtle background glow */}
            <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[#fbbc0e]/[0.03] blur-[140px]" />

            <div className="relative mx-auto max-w-7xl">
                <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
                    {/* Left Content */}
                    <div>
                        {/* Eyebrow */}
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-2 rounded border border-[#292722] bg-[#111111] px-3 py-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#fbbc0e]" />

                                <span className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.12em] text-[#ffd88a]">
                                    Solutions for Modern Logistics
                                </span>
                            </span>
                        </div>

                        {/* Heading */}
                        <h1 className="mt-7 font-[var(--font-hanken)] text-5xl font-bold leading-[0.98] tracking-[-0.03em] text-[#e5e2e1] sm:text-6xl lg:text-[60px]">
                            One Platform.
                            <br />
                            <span className="text-[#fbbc0e]">Every Move.</span>
                        </h1>

                        {/* Supporting heading */}
                        <p className="mt-7 max-w-xl font-[var(--font-inter)] text-lg leading-7 text-[#d4c5ac]">
                            Technology built for every side of the logistics ecosystem.
                        </p>

                        {/* Description */}
                        <p className="mt-4 max-w-xl font-[var(--font-inter)] text-sm leading-6 text-[#9c9487] sm:text-base">
                            Enroute connects customers, transporters, brokers, and fleet owners
                            through one intelligent B2B logistics platform—helping businesses
                            discover partners, win opportunities, coordinate capacity, and execute
                            transportation with greater control.
                        </p>

                        {/* CTA Buttons */}
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <a
                                href="/register"
                                className="group inline-flex h-13 items-center gap-3 rounded bg-[#fbbc0e] px-7 font-[var(--font-inter)] text-sm font-semibold text-black transition-all duration-300 hover:bg-[#ffd88a] hover:shadow-[0_0_25px_rgba(251,188,14,0.2)]"
                            >
                                <span>Get Started</span>

                                <ArrowRight
                                    size={17}
                                    strokeWidth={2}
                                    className="transition-transform duration-300 group-hover:translate-x-1"
                                    aria-hidden="true"
                                />
                            </a>

                            <a
                                href="#solutions"
                                className="group inline-flex h-13 items-center gap-3 rounded border border-[#292929] bg-[#111111] px-7 font-[var(--font-inter)] text-sm font-medium text-[#e5e2e1] transition-all duration-300 hover:border-[#806b3d] hover:bg-[#171614] hover:text-[#ffd88a]"
                            >
                                <BookOpen
                                    size={18}
                                    strokeWidth={1.8}
                                    className="transition-transform duration-300 group-hover:scale-105"
                                    aria-hidden="true"
                                />

                                <span>Explore Solutions</span>

                                <ChevronDown
                                    size={16}
                                    strokeWidth={1.8}
                                    className="transition-transform duration-300 group-hover:translate-y-0.5"
                                    aria-hidden="true"
                                />
                            </a>
                        </div>

                        {/* Divider */}
                        <div className="mt-10 h-px w-full bg-[#292929]" />

                        {/* Solution highlights */}
                        <div className="mt-8 grid grid-cols-3 gap-6">
                            <div className="group">
                                <span className="font-[var(--font-mono)] text-lg font-medium text-[#fbbc0e]">
                                    01
                                </span>

                                <h3 className="mt-3 font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[#d4c5ac]">
                                    Business Network
                                </h3>

                                <p className="mt-1 font-[var(--font-inter)] text-[10.5px] text-[#504b43]">
                                    Direct B2B Links
                                </p>
                            </div>

                            <div className="group">
                                <span className="font-[var(--font-mono)] text-lg font-medium text-[#fbbc0e]">
                                    02
                                </span>

                                <h3 className="mt-3 font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[#d4c5ac]">
                                    Transportation
                                    <br />
                                    Workflows
                                </h3>

                                <p className="mt-1 font-[var(--font-inter)] text-[10.5px] text-[#504b43]">
                                    RFQ to Invoicing
                                </p>
                            </div>

                            <div className="group">
                                <span className="font-[var(--font-mono)] text-lg font-medium text-[#fbbc0e]">
                                    03
                                </span>

                                <h3 className="mt-3 font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[#d4c5ac]">
                                    Connected Ecosystem
                                </h3>

                                <p className="mt-1 font-[var(--font-inter)] text-[10.5px] text-[#504b43]">
                                    4 Core Stakeholders
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Right Visual */}
                    <div className="group relative">
                        {/* Hover Glow */}
                        <div className="pointer-events-none absolute -inset-2 rounded-lg bg-[#fbbc0e]/0 blur-xl transition-all duration-500 group-hover:bg-[#fbbc0e]/20" />

                        {/* Image Card */}
                        <div className="relative overflow-hidden rounded-md bg-[#111111] ring-1 ring-[#222222] transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:ring-2 group-hover:ring-[#fbbc0e] group-hover:shadow-[0_0_35px_rgba(251,188,14,0.20)]">
                            {/* Image */}
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <Image
                                    src="/solution_Hero_Image.png"
                                    alt="EnrouteLogTech logistics operations"
                                    fill
                                    priority
                                    sizes="(max-width: 1024px) 100vw, 560px"
                                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                                />

                                {/* Image Overlay */}
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />
                            </div>

                            {/* Bottom Data Panel */}
                            <div className="absolute bottom-3 left-3 right-3 bg-[#111111]/95 p-4 backdrop-blur-md transition-all duration-500 group-hover:bg-[#111111]">
                                {/* Panel Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#fbbc0e] transition-transform duration-500 group-hover:rotate-90">
                                            ✣
                                        </span>

                                        <span className="font-[var(--font-mono)] text-[10px] font-medium tracking-[0.08em] text-[#d4c5ac]">
                                            B2B MULTIMODAL MATRIX
                                        </span>
                                    </div>

                                    <span className="font-[var(--font-mono)] text-[9px] font-medium text-[#ffd88a]">
                                        ONLINE
                                    </span>
                                </div>

                                {/* Data */}
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {/* Partners */}
                                    <div className="bg-[#0e0e0e] p-3 transition-all duration-300 group-hover:bg-[#151515]">
                                        <p className="font-[var(--font-mono)] text-[8px] uppercase tracking-[0.08em] text-[#ffd788]">
                                            Partners
                                        </p>

                                        <p className="mt-1 font-[var(--font-inter)] text-xs font-medium text-[#e5e2e1]">
                                            Verified Freight Co.
                                        </p>
                                    </div>

                                    {/* Execution */}
                                    <div className="bg-[#0e0e0e] p-3 transition-all duration-300 group-hover:bg-[#151515]">
                                        <p className="font-[var(--font-mono)] text-[8px] uppercase tracking-[0.08em] text-[#ffd788]">
                                            Execution
                                        </p>

                                        <p className="mt-1 font-[var(--font-inter)] text-xs font-medium text-[#e5e2e1]">
                                            Consolidated Trips
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
