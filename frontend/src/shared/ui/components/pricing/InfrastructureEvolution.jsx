const stages = [
    {
        number: '01',
        title: 'SMALL OPERATION',
        description: 'Digitizing core partners, structured RFQs, basic contract sign-offs.',
        focus: 'CLARITY',
    },
    {
        number: '02',
        title: 'GROWING OPERATION',
        description: 'Dynamic bid comparison, SLA management, active route milestones.',
        focus: 'VELOCITY',
    },
    {
        number: '03',
        title: 'MULTI-TEAM OPERATION',
        description: 'Multi-branch dispatch, secondary fleet liquidity, consolidated auditing.',
        focus: 'CAPACITY',
    },
    {
        number: '04',
        title: 'ENTERPRISE OPERATION',
        description: 'Dedicated multi-tier access, ecosystem coordination, high-volume automation.',
        focus: 'SCALE',
    },
];

const workflow = ['NETWORK', 'RFQ', 'BID', 'CONTRACT', 'FLEET', 'DRIVERS', 'TRIPS', 'REPORTS'];

export default function InfrastructureEvolution() {
    return (
        <section className="relative overflow-hidden border-b border-[#222222] bg-[#0e0e0e] px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                {/* Section Heading */}
                <div className="mx-auto max-w-[850px] text-center">
                    <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#fbbc0e] sm:text-[11px]">
                        Infrastructure Evolution
                    </p>

                    <h2 className="mt-4 font-[var(--font-hanken)] text-3xl font-bold leading-tight tracking-[-0.025em] text-[#f1efed] sm:text-4xl">
                        How Enroute scales with operational complexity
                    </h2>

                    <p className="mx-auto mt-3 max-w-[760px] font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px]">
                        From single-lane digitization to multi-regional logistics orchestration, the
                        platform accommodates increasing business maturity.
                    </p>
                </div>

                {/* Operational Stages */}
                <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {stages.map((stage) => (
                        <article
                            key={stage.number}
                            className="group relative flex min-h-[140px] flex-col rounded-md border border-[#222222] bg-[#111111] p-4 transition-all duration-400 hover:-translate-y-1 hover:border-[#504532] hover:bg-[#151515] hover:shadow-[0_15px_35px_rgba(0,0,0,0.3)]"
                        >
                            {/* Stage Number */}
                            <p className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.1em] text-[#526681]">
                                Stage {stage.number}
                            </p>

                            {/* Title */}
                            <h3 className="mt-2 font-[var(--font-hanken)] text-[14px] font-bold tracking-[-0.01em] text-[#e5e2e1]">
                                {stage.title}
                            </h3>

                            {/* Description */}
                            <p className="mt-2 font-[var(--font-inter)] text-[12px] leading-5 text-[#d4c5ac]">
                                {stage.description}
                            </p>

                            {/* Focus */}
                            <div className="mt-auto pt-3">
                                <span className="inline-flex items-center gap-1.5 font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.06em] text-[#fbbc0e]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#fbbc0e]" />
                                    Primary Focus: {stage.focus}
                                </span>
                            </div>

                            {/* Hover Accent */}
                            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#fbbc0e] transition-all duration-500 group-hover:w-1/2" />
                        </article>
                    ))}
                </div>

                {/* Unified Workflow Engine */}
                <div className="mt-8 rounded-md border border-[#222222] bg-[#111111] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* Label */}
                        <span className="shrink-0 font-[var(--font-mono)] text-[12px] font-medium uppercase tracking-[0.08em] text-[#526681]">
                            Unified Workflow Engine:
                        </span>

                        {/* Workflow */}
                        <div className="flex flex-wrap items-center gap-2">
                            {workflow.map((item, index) => (
                                <div key={item} className="flex items-center gap-2">
                                    <span className="rounded-[2px] border border-[#222222] bg-[#0e0e0e] px-2.5 py-2 font-[var(--font-mono)] text-[9px] font-medium uppercase tracking-[0.05em] text-[#e5e2e1] transition-colors duration-300 hover:border-[#504532] hover:text-[#fbbc0e]">
                                        {item}
                                    </span>

                                    {index < workflow.length - 1 && (
                                        <span className="font-[var(--font-mono)] text-[12px] text-[#fbbc0e]">
                                            →
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
