export default function AboutChallenge() {
    const stages = [
        {
            number: '01',
            title: 'Discover',
        },
        {
            number: '02',
            title: 'Opportunity',
        },
        {
            number: '03',
            title: 'Bidding',
        },
        {
            number: '04',
            title: 'Contracts',
        },
        {
            number: '05',
            title: 'Fleet Alloc',
        },
        {
            number: '06',
            title: 'Drivers',
        },
        {
            number: '07',
            title: 'Trips',
        },
    ];

    return (
        <section className="border-b border-[#222222] bg-[#131313] px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                {/* =====================================================
                    SECTION INTRO
                    ===================================================== */}
                <div className="max-w-[800px]">
                    {/* Label */}
                    <div className="flex items-center gap-3">
                        <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#fbbc0e] sm:text-[11px]">
                            The Challenge / 02
                        </span>

                        <span className="h-px w-8 bg-[#806b3d]" />
                    </div>

                    {/* Heading */}
                    <h2 className="mt-5 max-w-[760px] font-[var(--font-hanken)] text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-[#f1efed] sm:text-[38px] lg:text-[40px]">
                        Logistics is connected in the real world. Its technology often isn&apos;t.
                    </h2>

                    {/* Description */}
                    <p className="mt-4 max-w-[780px] font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px] sm:leading-6">
                        Transportation requires eight distinct milestones, yet traditional logistics
                        treats each phase as a detached manual silo across disconnected emails,
                        WhatsApp groups, and spreadsheets.
                    </p>
                </div>

                {/* =====================================================
                    WORKFLOW PANEL
                    ===================================================== */}
                <div className="mt-12 rounded-md border border-[#292929] bg-[#111111] p-5 sm:p-7">
                    {/* Stages */}
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-7">
                        {stages.map((stage) => (
                            <div
                                key={stage.number}
                                className="flex min-h-[64px] flex-col justify-center bg-[#1c1c1c] px-3 py-3 text-center transition-all duration-300 hover:bg-[#242424]"
                            >
                                {/* Stage Number */}
                                <span className="font-[var(--font-mono)] text-[9px] font-medium uppercase tracking-[0.08em] text-[#d4c5ac]">
                                    Stage {stage.number}
                                </span>

                                {/* Stage Name */}
                                <span className="mt-1.5 font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.05em] text-[#e5e2e1] sm:text-[10px]">
                                    {stage.title}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="mt-5 border-t border-dashed border-[#806b3d]" />

                    {/* Workflow Status */}
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#fbbc0e]" />

                            <span className="font-[var(--font-mono)] text-[9px] font-semibold uppercase tracking-[0.1em] text-[#fbbc0e] sm:text-[10px]">
                                Connected Through Enroute Operating Layer
                            </span>
                        </div>

                        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.07em] text-[#526681] sm:text-[11px]">
                            Protocol // Zero Manual Re-entry · Unified Audit Chain
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
