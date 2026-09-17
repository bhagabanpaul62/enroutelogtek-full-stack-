import { ArrowRight } from 'lucide-react';

export default function SupportHero() {
    return (
        <section className="relative overflow-hidden border-b border-[#222222] bg-black px-6 py-24 sm:py-28 lg:py-32">
            <div className="mx-auto max-w-6xl">
                <div className="max-w-[900px]">
                    {/* Technical Label */}
                    <div className="inline-flex items-center gap-2 rounded border border-[#292929] bg-[#111111] px-3 py-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#fbbc0e]" />

                        <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#fbbc0e] sm:text-[11px]">
                            Support // Enroute LogTek
                        </span>

                        <span className="text-[#504532]">|</span>

                        <span className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.1em] text-[#526681]">
                            Operational Help Center
                        </span>
                    </div>

                    {/* Heading */}
                    <div className="mt-7 max-w-[900px] font-[var(--font-hanken)] text-4xl font-bold leading-[1.02] tracking-[-0.035em] text-[#f1efed] sm:text-5xl lg:text-[56px]">
                        Good support should remove friction—not add{' '}
                        <h1 className="text-[#fbbc0e]">another workflow.</h1>
                    </div>

                    {/* Description */}
                    <p className="mt-5 max-w-[720px] font-[var(--font-inter)] text-[17px] leading-7 text-[#d4c5ac] sm:text-[18px]">
                        Find answers, explore guidance, or connect with the Enroute team when you
                        need help.Enroute is designed to make complex logistics workflows easier to
                        understand, navigate and operate. Support should follow the same principle:
                        clear information, direct paths and practical guidance.
                    </p>

                    {/* Contact Support */}
                    <div className="mt-8">
                        <a
                            href="/contact"
                            className="group inline-flex h-12 items-center justify-center gap-3 rounded bg-[#fbbc0e] px-7 font-[var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.09em] text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffd88a] hover:shadow-[0_10px_30px_rgba(251,188,14,0.18)]"
                        >
                            <span>Contact Support</span>

                            <ArrowRight
                                size={16}
                                strokeWidth={2}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
