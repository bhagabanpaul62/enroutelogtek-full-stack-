import { ArrowRight, ExternalLink } from 'lucide-react';

export default function SupportCTA() {
    return (
        <section className="relative overflow-hidden border-b border-[#292929] bg-[#0e0e0e] px-6 py-20 sm:py-24 lg:py-28">
            <div className="relative mx-auto max-w-5xl text-center">
                {/* Heading */}
                <h2 className="font-[var(--font-hanken)] text-3xl font-bold leading-tight tracking-[-0.025em] text-[#f1efed] sm:text-4xl">
                    Keep moving with confidence.
                </h2>

                {/* Description */}
                <p className="mx-auto mt-4 max-w-[700px] font-[var(--font-inter)] text-[15px] leading-6 text-[#d4c5ac] sm:text-[16px] sm:leading-7">
                    Get the guidance you need to keep your logistics workflow moving.
                </p>

                {/* Buttons */}
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    {/* Contact Support */}
                    <a
                        href="/contact"
                        className="group inline-flex h-12 min-w-[194px] items-center justify-center gap-3 rounded bg-[#fbbc0e] px-6 font-[var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.08em] text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffd88a] hover:shadow-[0_10px_30px_rgba(251,188,14,0.18)]"
                    >
                        <span>Contact Support</span>

                        <ArrowRight
                            size={16}
                            strokeWidth={2}
                            className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                    </a>

                    {/* Explore Platform */}
                    <a
                        href="/"
                        className="group inline-flex h-12 min-w-[202px] items-center justify-center gap-3 rounded border border-[#292929] bg-[#111111] px-6 font-[var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.08em] text-[#e5e2e1] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#504532] hover:bg-[#171717] hover:text-[#ffd88a]"
                    >
                        <span>Explore Platform</span>

                        <ExternalLink
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
