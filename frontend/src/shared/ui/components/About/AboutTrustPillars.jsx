const pillars = [
    {
        number: '01',
        title: 'Verified Businesses',
        description:
            'Every company is audited for compliance, registration, and operating authority.',
    },
    {
        number: '02',
        title: 'Clear Roles',
        description:
            'Strict functional boundaries between shippers, carriers, brokers, and fleet owners.',
    },
    {
        number: '03',
        title: 'Business Relationships',
        description:
            'Direct counterparty relationships backed by explicit mutual acceptance protocols.',
    },
    {
        number: '04',
        title: 'Operational Workflows',
        description:
            'Standardized RFQs, bids, contracts, and digital PODs replace manual fragmentation.',
    },
    {
        number: '05',
        title: 'Long-term Network',
        description:
            'Built to foster enduring contractual partnerships rather than disposable spot transactions.',
    },
];

export default function AboutTrustPillars() {
    return (
        <section className="border-b border-[#222222] bg-black px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                {/* =====================================================
                    SECTION HEADER
                ===================================================== */}
                <div className="max-w-[780px]">
                    <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#fbbc0e] sm:text-[11px]">
                        Enterprise Integrity
                    </p>

                    <h2 className="mt-4 font-[var(--font-hanken)] text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-[#f1efed] sm:text-[38px] lg:text-[40px]">
                        Five core pillars of trust.
                    </h2>

                    <p className="mt-4 max-w-[760px] font-[var(--font-inter)] text-[15px] leading-6 text-[#d4c5ac] sm:text-[16px] sm:leading-7">
                        Real enterprise logistics demands rigorous operational safeguards. Our
                        architecture guarantees authenticity across each node.
                    </p>
                </div>

                {/* =====================================================
                    PILLARS
                ===================================================== */}
                <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
                    {pillars.map((pillar) => (
                        <article
                            key={pillar.number}
                            className="group relative flex min-h-[215px] flex-col rounded-md border border-[#292929] bg-[#111111] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#806b3d] hover:bg-[#151515] hover:shadow-[0_15px_35px_rgba(0,0,0,0.3)]"
                        >
                            {/* Subtle hover glow */}
                            <div className="pointer-events-none absolute -inset-px rounded-md bg-[#fbbc0e]/0 blur-xl transition-all duration-500 group-hover:bg-[#fbbc0e]/[0.025]" />

                            <div className="relative z-10 flex h-full flex-col">
                                {/* Pillar Number */}
                                <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#fbbc0e]">
                                    Pillar {pillar.number}
                                </p>

                                {/* Title */}
                                <h3 className="mt-4 font-[var(--font-hanken)] text-[16px] font-bold leading-5 text-[#e5e2e1] transition-colors duration-300 group-hover:text-[#ffd88a]">
                                    {pillar.title}
                                </h3>

                                {/* Description */}
                                <p className="mt-3 font-[var(--font-inter)] text-[12px] leading-[1.55] text-[#d4c5ac] sm:text-[13px]">
                                    {pillar.description}
                                </p>
                            </div>

                            {/* Bottom Accent */}
                            <span className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-[#fbbc0e] transition-all duration-300 group-hover:w-1/2" />
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
