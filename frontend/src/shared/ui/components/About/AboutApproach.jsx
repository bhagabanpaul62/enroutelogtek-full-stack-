const approaches = [
    {
        number: '01',
        title: 'Professional B2B Business Network',
        description:
            'A trusted ecosystem founded on validated company profiles, operational credentials, genuine legal entities, and long-term business partnerships—eliminating spot-market anonymity.',
        points: [
            'Direct Enterprise Mutual Acceptance',
            'Entity Verification & Compliance Ledger',
            'Long-term Contract Governance',
        ],
    },
    {
        number: '02',
        title: 'Transportation Workflow Engine',
        description:
            'A structured execution engine that transforms verified relationships into repeatable shipments: RFQ creation, transparent bid evaluations, legally-bound awards, and real-time execution.',
        points: [
            'Structured RFQ & Quotation Matrices',
            'Capacity Assignment to Asset Records',
            'Real-Time Telemetry & Digital POD',
        ],
    },
];

export default function AboutApproach() {
    return (
        <section className="border-b border-[#222222] bg-black px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                {/* =====================================================
                    SECTION INTRO
                    ===================================================== */}
                <div className="max-w-[800px]">
                    {/* Label */}
                    <div className="flex items-center gap-3">
                        <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#fbbc0e] sm:text-[11px]">
                            Our Approach / 03
                        </span>

                        <span className="h-px w-8 bg-[#806b3d]" />
                    </div>

                    {/* Heading */}
                    <h2 className="mt-5 max-w-[700px] font-[var(--font-hanken)] text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-[#f1efed] sm:text-[38px] lg:text-[40px]">
                        Connect the relationship first.
                        <br />
                        Then connect the workflow.
                    </h2>

                    {/* Description */}
                    <p className="mt-4 max-w-[780px] font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px] sm:leading-6">
                        Generic platforms jump straight to anonymous load-matching, causing low
                        trust and high cancellation rates. Enroute prioritizes enterprise business
                        verification and verified relationships as the permanent anchor for
                        executing recurring freight.
                    </p>
                </div>

                {/* =====================================================
                    APPROACH CARDS
                    ===================================================== */}
                <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {approaches.map((approach) => (
                        <article
                            key={approach.number}
                            className="group relative rounded-md border border-[#292929] bg-[#111111] p-7 transition-all duration-500 hover:-translate-y-1 hover:border-[#504532] hover:bg-[#151515] hover:shadow-[0_18px_45px_rgba(0,0,0,0.3)] sm:p-8"
                        >
                            {/* Subtle Hover Glow */}
                            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#fbbc0e]/0 blur-3xl transition-all duration-700 group-hover:bg-[#fbbc0e]/[0.04]" />

                            <div className="relative z-10">
                                {/* Number */}
                                <div className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-[#504532] bg-[#0e0e0e]">
                                    <span className="font-[var(--font-mono)] text-[11px] font-semibold text-[#fbbc0e]">
                                        {approach.number}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="mt-6 font-[var(--font-hanken)] text-[17px] font-bold leading-6 tracking-[-0.015em] text-[#e5e2e1] sm:text-[18px]">
                                    {approach.title}
                                </h3>

                                {/* Description */}
                                <p className="mt-3 max-w-[560px] font-[var(--font-inter)] text-[14px] leading-5 text-[#d4c5ac] sm:text-[14px] sm:leading-6">
                                    {approach.description}
                                </p>

                                {/* Divider */}
                                <div className="my-5 h-px bg-[#292929]" />

                                {/* Points */}
                                <ul className="space-y-2.5">
                                    {approach.points.map((point) => (
                                        <li key={point} className="flex items-start gap-3">
                                            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#fbbc0e]" />

                                            <span className="font-[var(--font-mono)] text-[10px] font-medium leading-4 tracking-[0.03em] text-[#d4c5ac] sm:text-[11px]">
                                                {point}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
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
