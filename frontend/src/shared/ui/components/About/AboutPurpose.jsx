import Image from 'next/image';
import { Check } from 'lucide-react';

export default function AboutPurpose() {
    return (
        <section className="border-b border-[#222222] bg-black px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.95fr] lg:gap-16">
                    {/* =================================================
                        LEFT CONTENT
                    ================================================= */}
                    <div>
                        {/* Section Label */}
                        <div className="flex items-center gap-3">
                            <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#fbbc0e] sm:text-[11px]">
                                Our Purpose / 01
                            </span>

                            <span className="h-px w-8 bg-[#806b3d]" />
                        </div>

                        {/* Heading */}
                        <h2 className="mt-6 max-w-[520px] font-[var(--font-hanken)] text-[40px] font-bold leading-[1.04] tracking-[-0.035em] text-[#f1efed] sm:text-[48px] lg:text-[50px]">
                            Make logistics more
                            <br />
                            connected.
                        </h2>

                        {/* Paragraph 1 */}
                        <p className="mt-6 max-w-[590px] font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px] sm:leading-6">
                            Logistics is the backbone of commerce, yet the infrastructure connecting
                            its stakeholders has long remained fragmented. Moving physical freight
                            requires high-fidelity coordination across shippers who require reliable
                            delivery windows, transporters running commercial networks, and fleet
                            owners managing mission-critical rolling assets.
                        </p>

                        {/* Paragraph 2 */}
                        <p className="mt-4 max-w-[590px] font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px] sm:leading-6">
                            We do not believe in replacing physical capability with automated black
                            boxes. We believe in providing the unified operational operating layer
                            that gives every participant clear visibility, verified counterparties,
                            seamless contractual flows, and predictable capacity allocation.
                        </p>

                        {/* Principles */}
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-7">
                            <div className="flex items-center gap-2">
                                <Check size={15} strokeWidth={2} className="text-[#fbbc0e]" />

                                <span className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.06em] text-[#d4c5ac]">
                                    Zero Fabricated Aggregations
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Check size={15} strokeWidth={2} className="text-[#fbbc0e]" />

                                <span className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.06em] text-[#d4c5ac]">
                                    Direct Entity Coordination
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* =================================================
                        RIGHT IMAGE
                    ================================================= */}
                    <div className="group relative">
                        {/* Image Glow */}
                        <div className="pointer-events-none absolute -inset-2 rounded-lg bg-[#fbbc0e]/0 blur-2xl transition-all duration-500 group-hover:bg-[#fbbc0e]/[0.06]" />

                        <div className="relative overflow-hidden rounded-md border border-[#292929] bg-[#111111] transition-all duration-500 group-hover:-translate-y-1 group-hover:border-[#806b3d] group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <Image
                                    src="/About_LogisticsImage.png"
                                    alt="Logistics warehouse operations"
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
