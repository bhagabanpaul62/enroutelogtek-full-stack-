const businesses = [
    {
        role: 'Role 01 // Demand',
        category: 'Shippers & Manufacturers',
        title: 'Customer',
        subtitle: 'The demand side of transportation',
        description:
            'Enterprises and industrial shippers generating volume. Issue verified RFQs, receive structured commercial bids from reliable carriers, award contracts, and oversee corridor SLAs.',
        surface: 'RFQ Creation • Bid Comparison Matrix • SLA Analytics',
    },
    {
        role: 'Role 02 // Carrier',
        category: 'Logistics Operators',
        title: 'Transporter',
        subtitle: 'The transportation provider',
        description:
            'Established carrier corporations with committed contracts. Discover vetted enterprise freight, submit compliant quotes, dynamically allocate fleets, and maintain operational credibility.',
        surface: 'Lane RFQ Response • Capacity Allocation • Trip Milestones',
    },
    {
        role: 'Role 03 // Coordinator',
        category: 'Liquidity & Matching',
        title: 'Broker',
        subtitle: 'The coordinator across the network',
        description:
            'Commercial intermediaries matching fragmented demand with distributed capacity across regional corridors, orchestrating high-velocity lanes with complete transparency.',
        surface: 'Direct Capacity Queues • Margin Structuring • Route Dispatch',
    },
    {
        role: 'Role 04 // Asset',
        category: 'Vehicle Asset Owners',
        title: 'Fleet Owner',
        subtitle: 'The capacity behind the movement',
        description:
            'Vehicle asset holders, fleet managers, and truck owners supplying active commercial wheels. Connect directly with transporters to ensure high fleet utilization and on-time settlement.',
        surface: 'Vehicle Readiness Registry • Driver Assignment • Earnings Log',
    },
];

export default function AboutBusinesses() {
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
                            The Four Businesses We Serve / 04
                        </span>

                        <span className="h-px w-8 bg-[#806b3d]" />
                    </div>

                    {/* Heading */}
                    <h2 className="mt-5 font-[var(--font-hanken)] text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-[#f1efed] sm:text-[38px] lg:text-[40px]">
                        Tailored tools for every chair in logistics.
                    </h2>

                    {/* Description */}
                    <p className="mt-4 max-w-[760px] font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px]">
                        Enroute does not force identical interfaces onto different roles. Each
                        participant operates with purpose-built tooling matched to their position in
                        the supply chain.
                    </p>
                </div>

                {/* =====================================================
                    BUSINESS CARDS
                    ===================================================== */}
                <div className="mt-11 grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {businesses.map((business) => (
                        <article
                            key={business.title}
                            className="group relative overflow-hidden rounded-md border border-[#292929] bg-[#111111] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[#504532] hover:bg-[#151515] hover:shadow-[0_18px_45px_rgba(0,0,0,0.3)] sm:p-7"
                        >
                            {/* Subtle hover glow */}
                            <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#fbbc0e]/0 blur-3xl transition-all duration-700 group-hover:bg-[#fbbc0e]/[0.04]" />

                            <div className="relative z-10">
                                {/* Top Row */}
                                <div className="flex items-start justify-between gap-5">
                                    <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#fbbc0e]">
                                        {business.role}
                                    </span>

                                    <span className="text-right font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.06em] text-[#526681]">
                                        {business.category}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="mt-5 font-[var(--font-hanken)] text-[22px] font-bold tracking-[-0.02em] text-[#e5e2e1] sm:text-[21px]">
                                    {business.title}
                                </h3>

                                {/* Subtitle */}
                                <p className="mt-1 font-[var(--font-inter)] text-[14px] font-semibold text-[#fbbc0e]">
                                    {business.subtitle}
                                </p>

                                {/* Description */}
                                <p className="mt-4 max-w-[620px] font-[var(--font-inter)] text-[14px] leading-5 text-[#d4c5ac] sm:text-[13px] sm:leading-5">
                                    {business.description}
                                </p>

                                {/* Divider */}
                                <div className="my-5 h-px bg-[#292929]" />

                                {/* Operational Surface */}
                                <div>
                                    <p className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.1em] text-[#526681]">
                                        Key Operational Surface:
                                    </p>

                                    <p className="mt-2 font-[var(--font-mono)] text-[10px] font-semibold leading-4 text-[#e5e2e1] sm:text-[11px]">
                                        {business.surface}
                                    </p>
                                </div>
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
