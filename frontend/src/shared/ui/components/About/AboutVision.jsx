const statusQuo = [
    {
        title: 'Unverified WhatsApp & Phone Chains',
        description:
            'Vulnerable to freight fraud, double-brokering, and undocumented rate escalations.',
    },
    {
        title: 'Disconnected Paper PODs',
        description:
            'Days or weeks of delay waiting for physical paper stamps before invoices can be processed.',
    },
    {
        title: 'Blind Capacity Scrambles',
        description:
            'Transporters reject large contracts because they lack rapid, trusted access to secondary fleets.',
    },
];

const enrouteStandard = [
    {
        title: 'Verified Enterprise Identity',
        description:
            'Every RFQ, proposal, and truck allocation ties directly to authenticated business legal profiles.',
    },
    {
        title: 'Instant Digital Proof of Delivery',
        description:
            'Instant tamper-resistant digital sign-offs trigger financial and operational trip completion.',
    },
    {
        title: 'Predictable Elastic Fleet Mesh',
        description:
            'Transporters confidently bid on large shipper contracts backed by vetted Fleet Owner capacity.',
    },
];

function ComparisonItem({ item, positive = false }) {
    return (
        <li className="flex items-start gap-3">
            <span
                className={`mt-0.5 shrink-0 font-[var(--font-inter)] text-[17px] leading-5 ${
                    positive ? 'text-[#fbbc0e]' : 'text-[#ff4545]'
                }`}
            >
                {positive ? '✓' : '×'}
            </span>

            <div>
                <h3 className="font-[var(--font-inter)] text-[13px] font-bold leading-5 text-[#e5e2e1]">
                    {item.title}
                </h3>

                <p className="mt-0.5 font-[var(--font-inter)] text-[12px] leading-[1.45] text-[#d4c5ac] sm:text-[13px]">
                    {item.description}
                </p>
            </div>
        </li>
    );
}

export default function AboutVision() {
    return (
        <section className="border-b border-[#222222] bg-[#131313] px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                {/* =====================================================
                    SECTION INTRO
                    ===================================================== */}
                <div className="mx-auto max-w-[850px] text-center">
                    {/* Label */}
                    <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#fbbc0e] sm:text-[11px]">
                        Our Vision / 06
                    </p>

                    {/* Heading */}
                    <h2 className="mt-5 font-[var(--font-hanken)] text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-[#f1efed] sm:text-[38px] lg:text-[40px]">
                        A connected operating layer for logistics.
                    </h2>

                    {/* Description */}
                    <p className="mx-auto mt-4 max-w-[760px] font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px]">
                        Comparing the disjointed status quo with the unified infrastructure
                        engineered by Enroute Logtek.
                    </p>
                </div>

                {/* =====================================================
                    COMPARISON
                    ===================================================== */}
                <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* =================================================
                        STATUS QUO
                        ================================================= */}
                    <article className="rounded-md border border-[#3a2020] bg-[#111111] p-6 sm:p-7">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-4">
                            <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#ff4545] sm:text-[10px]">
                                The Status Quo
                            </span>

                            <span className="font-[var(--font-mono)] text-[9px] font-medium uppercase tracking-[0.07em] text-[#526681]">
                                Fragmented Silos
                            </span>
                        </div>

                        {/* Items */}
                        <ul className="mt-6 space-y-5">
                            {statusQuo.map((item) => (
                                <ComparisonItem key={item.title} item={item} />
                            ))}
                        </ul>
                    </article>

                    {/* =================================================
                        ENROUTE STANDARD
                        ================================================= */}
                    <article className="relative rounded-md border border-[#806b3d] bg-[#191919] p-6 shadow-[0_0_25px_rgba(251,188,14,0.05)] sm:p-7">
                        {/* Soft glow */}
                        <div className="pointer-events-none absolute -inset-px rounded-md bg-[#fbbc0e]/[0.02]" />

                        <div className="relative z-10">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#fbbc0e] sm:text-[10px]">
                                    The Enroute Standard
                                </span>

                                <span className="font-[var(--font-mono)] text-[9px] font-medium uppercase tracking-[0.07em] text-[#fbbc0e]">
                                    Unified Operating Layer
                                </span>
                            </div>

                            {/* Items */}
                            <ul className="mt-6 space-y-5">
                                {enrouteStandard.map((item) => (
                                    <ComparisonItem key={item.title} item={item} positive />
                                ))}
                            </ul>
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}
