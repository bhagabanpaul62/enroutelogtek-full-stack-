const beliefs = [
    {
        number: '01',
        category: 'Identity',
        title: 'Business First',
        description:
            'Every participant operates under verified corporate identity. No ghost carriers or unaccountable listings.',
    },
    {
        number: '02',
        category: 'Integration',
        title: 'Connected',
        description:
            'Workflows chain logically. Quotations turn directly into enforceable trip orders without retyping data.',
    },
    {
        number: '03',
        category: 'Utility',
        title: 'Practical',
        description:
            'Designed for high-speed terminal docks, fleet depots, and dispatch offices. Clean, low-latency, and fast.',
    },
    {
        number: '04',
        category: 'Audit',
        title: 'Trustworthy',
        description:
            'Immutable milestones, verifiable POD records, and agreed terms signed with digital precision.',
    },
    {
        number: '05',
        category: 'Expansion',
        title: 'Scalable',
        description:
            'Built to scale effortlessly from regional 10-truck contracts to multinational million-ton operations.',
    },
];

export default function AboutBeliefs() {
    return (
        <section className="border-b border-[#222222] bg-[#131313] px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                {/* =====================================================
                    SECTION INTRO
                ===================================================== */}
                <div className="max-w-[850px]">
                    {/* Label */}
                    <div className="flex items-center gap-3">
                        <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#fbbc0e] sm:text-[11px]">
                            What We Believe / 05
                        </span>

                        <span className="h-px w-8 bg-[#806b3d]" />
                    </div>

                    {/* Heading */}
                    <h2 className="mt-5 font-[var(--font-hanken)] text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-[#f1efed] sm:text-[38px] lg:text-[40px]">
                        Engineered on strict logistics reality.
                    </h2>

                    {/* Description */}
                    <p className="mt-4 max-w-[780px] font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px]">
                        We avoid speculative technology buzzwords. Our system is built entirely on
                        authentic operating principles demanded by real industrial operations.
                    </p>
                </div>

                {/* =====================================================
                    BELIEF CARDS
                    ===================================================== */}
                <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
                    {beliefs.map((belief) => (
                        <article
                            key={belief.number}
                            className="group relative flex min-h-[205px] flex-col rounded-md border border-[#292929] bg-[#111111] p-5 transition-all duration-500 hover:-translate-y-1 hover:border-[#504532] hover:bg-[#151515] hover:shadow-[0_18px_40px_rgba(0,0,0,0.3)] sm:p-6"
                        >
                            {/* Subtle Hover Glow */}
                            <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#fbbc0e]/0 blur-2xl transition-all duration-700 group-hover:bg-[#fbbc0e]/[0.04]" />

                            <div className="relative z-10 flex h-full flex-col">
                                {/* Number + Category */}
                                <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#fbbc0e]">
                                    {belief.number} // {belief.category}
                                </p>

                                {/* Title */}
                                <h3 className="mt-5 font-[var(--font-hanken)] text-[17px] font-bold tracking-[-0.015em] text-[#e5e2e1] sm:text-[18px]">
                                    {belief.title}
                                </h3>

                                {/* Description */}
                                <p className="mt-4 font-[var(--font-inter)] text-[12px] leading-5 text-[#d4c5ac] sm:text-[13px] sm:leading-5">
                                    {belief.description}
                                </p>
                            </div>

                            {/* Bottom Accent */}
                            <div className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[#fbbc0e] transition-all duration-500 group-hover:w-1/3" />
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
