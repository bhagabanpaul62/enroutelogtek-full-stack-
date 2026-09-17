const relationshipSteps = [
    {
        number: '01',
        title: 'Discover',
        description: 'Identify verified counterparties on specified lanes and asset types.',
    },
    {
        number: '02',
        title: 'Connect',
        description: 'Establish mutual enterprise links with authorized representative sign-off.',
    },
    {
        number: '03',
        title: 'Build Relationship',
        description:
            'Agree upon Master Service Agreements, commercial terms, and insurance thresholds.',
    },
    {
        number: '04',
        title: 'Find Opportunity',
        description: 'Broadcast closed RFQs and direct invitations to vetted partners only.',
    },
    {
        number: '05',
        title: 'Work Together',
        description:
            'Execute trips with shared operational visibility, milestone triggers, and telematics.',
    },
    {
        number: '06',
        title: 'Grow',
        description: 'Expand contract volumes based on demonstrated historic performance.',
        featured: true,
    },
];

export default function AboutRelationships() {
    return (
        <section className="border-b border-[#222222] bg-black px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-7xl">
                {/* =====================================================
                    SECTION INTRO
                    ===================================================== */}
                <div className="mx-auto max-w-[850px] text-center">
                    {/* Label */}
                    <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#fbbc0e] sm:text-[11px]">
                        Relationships Before Transactions
                    </p>

                    {/* Heading */}
                    <h2 className="mt-5 font-[var(--font-hanken)] text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-[#f1efed] sm:text-[38px] lg:text-[40px]">
                        Not just a marketplace. A business network.
                    </h2>

                    {/* Description */}
                    <p className="mx-auto mt-4 max-w-[800px] font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px] sm:leading-6">
                        Transactional spot markets commoditize logistics and degrade reliability.
                        Enroute enables parties to formalize recurring partnerships that withstand
                        supply chain turbulence.
                    </p>
                </div>

                {/* =====================================================
                    RELATIONSHIP STEPS
                    ===================================================== */}
                <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
                    {relationshipSteps.map((step) => (
                        <article
                            key={step.number}
                            className={`group relative flex min-h-[178px] flex-col rounded-lg border p-5 transition-all duration-500 ${
                                step.featured
                                    ? 'border-[#fbbc0e] bg-[#0f0d05] shadow-[0_0_25px_rgba(251,188,14,0.04)]'
                                    : 'border-[#292929] bg-[#111111] hover:-translate-y-1 hover:border-[#504532] hover:bg-[#151515]'
                            }`}
                        >
                            {/* Subtle Hover Glow */}
                            {!step.featured && (
                                <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#fbbc0e]/0 blur-2xl transition-all duration-700 group-hover:bg-[#fbbc0e]/[0.04]" />
                            )}

                            <div className="relative z-10 flex h-full flex-col">
                                {/* Step Number */}
                                <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#fbbc0e]">
                                    Step {step.number}
                                </span>

                                {/* Title */}
                                <h3 className="mt-4 font-[var(--font-hanken)] text-[16px] font-bold leading-5 tracking-[-0.015em] text-[#e5e2e1] sm:text-[17px]">
                                    {step.title}
                                </h3>

                                {/* Description */}
                                <p className="mt-4 font-[var(--font-inter)] text-[12px] leading-[1.55] text-[#d4c5ac] sm:text-[13px]">
                                    {step.description}
                                </p>
                            </div>

                            {/* Featured Bottom Accent */}
                            {step.featured && (
                                <div className="absolute bottom-0 left-1/2 h-[2px] w-1/2 -translate-x-1/2 bg-[#fbbc0e]" />
                            )}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
