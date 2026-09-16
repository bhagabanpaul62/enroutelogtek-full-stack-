const workflowSteps = [
    {
        number: '01',
        label: 'REQUIREMENT',
        title: 'Customer RFQ',
        description:
            'Customer creates and publishes transportation requirements with exact specifications and lanes.',
        meta: 'INPUT: DEMAND',
    },
    {
        number: '02',
        label: 'BIDDING',
        title: 'Transporter Offers',
        description:
            'Eligible transporters submit transparent commercial bids and vehicle capability quotes.',
        meta: 'STEP: DISCOVERY',
    },
    {
        number: '03',
        label: 'AWARD',
        title: 'Selection',
        description:
            'Customer evaluates side-by-side bid matrices and selects the optimal transporter for the corridor.',
        meta: 'STAGE: DECISION',
    },
    {
        number: '04',
        label: 'CONTRACT',
        title: 'Work Confirmed',
        description:
            'Commercial terms, SLA criteria, and freight agreements are locked into structured records.',
        meta: 'BINDING: AUDIT',
    },
    {
        number: '05',
        label: 'EXECUTION',
        title: 'Fleet Dispatch',
        description:
            'Specific verified vehicles and licensed drivers are assigned and scheduled for load pickup.',
        meta: 'ASSETS: WHEELS',
    },
    {
        number: '06',
        label: 'TRIP',
        title: 'Completion',
        description:
            'Trip is monitored to delivery, status logs are updated, and digital POD confirms closeout.',
        meta: 'FINAL: COMPLETED',
        final: true,
    },
];

export default function EnrouteWorkflow() {
    return (
        <section className="border-t border-[#222222] bg-[#131313] px-6 py-24 sm:py-28 lg:py-32">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="max-w-3xl">
                    <p className="font-[var(--font-mono)] text-[12px] font-medium uppercase tracking-[0.18em] text-[#fbbc0e]">
                        The Enroute Workflow
                    </p>

                    <h2 className="mt-5 font-[var(--font-hanken)] text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-[#e5e2e1] sm:text-5xl">
                        From transportation requirement
                        <br className="hidden sm:block" /> to completed trip.
                    </h2>

                    <p className="mt-5 max-w-3xl font-[var(--font-inter)] text-base leading-6 text-[#d4c5ac] sm:text-[17px] sm:leading-7">
                        Enroute isn't simply a company directory or lead board. It structures and
                        governs the complete transportation lifecycle from origin specification to
                        final POD.
                    </p>
                </div>

                {/* Workflow Cards */}
                <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    {workflowSteps.map((step) => (
                        <article
                            key={step.number}
                            className={`group relative flex min-h-[205px] flex-col overflow-hidden rounded-md border p-4 transition-all duration-500 ease-out hover:-translate-y-1 ${
                                step.final
                                    ? 'border-[#242424] bg-[#1c1b1b] hover:border-[#806b3d] hover:bg-[#201f1f] hover:shadow-[0_12px_35px_rgba(0,0,0,0.3)]'
                                    : 'border-[#222222] bg-[#111111] hover:border-[#806b3d] hover:bg-[#171614] hover:shadow-[0_12px_35px_rgba(0,0,0,0.3)]'
                            }`}
                        >
                            {/* Hover Glow */}
                            <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full bg-[#fbbc0e]/0 blur-3xl transition-all duration-700 group-hover:bg-[#fbbc0e]/[0.07]" />

                            {/* Step Header */}
                            <div className="relative z-10 flex items-center gap-2">
                                <span className="font-[var(--font-mono)] text-[10px] font-semibold tracking-[0.08em] text-[#fbbc0e]">
                                    {step.number}
                                </span>

                                <span className="font-[var(--font-mono)] text-[9px] font-semibold uppercase tracking-[0.08em] text-[#fbbc0e]">
                                    {step.label}
                                </span>
                            </div>

                            {/* Title */}
                            <h3 className="relative z-10 mt-4 font-[var(--font-inter)] text-[15px] font-semibold leading-5 text-[#e5e2e1] transition-colors duration-300 group-hover:text-[#ffd88a]">
                                {step.title}
                            </h3>

                            {/* Description */}
                            <p className="relative z-10 mt-2 font-[var(--font-inter)] text-[12px] leading-[1.55] text-[#b8ad99] transition-colors duration-300 group-hover:text-[#d4c5ac]">
                                {step.description}
                            </p>

                            {/* Bottom Meta */}
                            <div className="relative z-10 mt-auto border-t border-[#222222] pt-4">
                                <span
                                    className={`font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.08em] ${
                                        step.final ? 'text-[#22c55e]' : 'text-[#4f6280]'
                                    }`}
                                >
                                    {step.meta}
                                </span>
                            </div>

                            {/* Bottom Accent */}
                            <div className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[#ffd88a] transition-all duration-500 group-hover:w-1/2" />
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
