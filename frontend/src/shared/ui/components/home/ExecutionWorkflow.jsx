const steps = [
    {
        number: '1',
        title: 'Manufacturer',
        description: (
            <>
                Load request
                <br />
                generated
                <br />
                from ERP
            </>
        ),
        variant: 'light',
    },
    {
        number: '2',
        title: 'RFQ',
        description: (
            <>
                Automated
                <br />
                lane
                <br />
                broadcasting
            </>
        ),
        variant: 'dark',
    },
    {
        number: '3',
        title: 'Bidding',
        description: (
            <>
                Live
                <br />
                competitive
                <br />
                pricing engine
            </>
        ),
        variant: 'dark',
    },
    {
        number: '4',
        title: 'Award',
        description: (
            <>
                Algorithmic
                <br />
                carrier
                <br />
                selection
            </>
        ),
        variant: 'light',
    },
    {
        number: '5',
        title: 'Execution',
        description: (
            <>
                Real-time
                <br />
                GPS trip
                <br />
                tracking
            </>
        ),
        variant: 'dark',
    },
    {
        number: '6',
        title: 'POD',
        description: (
            <>
                Instant digital
                <br />
                verification
            </>
        ),
        variant: 'dark',
    },
    {
        number: '7',
        title: 'Completion',
        description: (
            <>
                Settlement &
                <br />
                Performance
                <br />
                Analytics
            </>
        ),
        variant: 'yellow',
    },
];

export default function ExecutionWorkflow() {
    return (
        <section className="bg-black px-6 py-24 sm:py-28">
            <div className="mx-auto max-w-7xl">
                {/* Heading */}
                <h2 className="text-center font-[var(--font-hanken)] text-3xl font-semibold tracking-tight text-[#e5e2e1] sm:text-4xl">
                    Execution Excellence Workflow
                </h2>

                {/* Workflow */}
                <div className="relative mt-20">
                    {/* Connecting Line */}
                    <div className="absolute left-[5%] right-[5%] top-[34px] h-px bg-[#292929] transition-all duration-700" />

                    <div className="relative grid grid-cols-7">
                        {steps.map((step) => (
                            <div
                                key={step.number}
                                className="group relative flex flex-col items-center text-center"
                            >
                                {/* Soft glow behind active step */}
                                <div className="absolute top-0 h-[70px] w-[70px] rounded-full bg-[#fbbc0e]/0 blur-2xl transition-all duration-500 group-hover:bg-[#fbbc0e]/15" />

                                {/* Number Box */}
                                <div
                                    className={`relative z-10 flex h-[68px] w-[68px] items-center justify-center rounded-[4px] border transition-all duration-500 ease-out group-hover:-translate-y-1 ${
                                        step.variant === 'light'
                                            ? 'border-[#ffd88a] bg-[#ffd88a] text-[#2a2417] group-hover:shadow-[0_0_25px_rgba(255,216,138,0.35)]'
                                            : step.variant === 'yellow'
                                              ? 'border-[#fbbc0e] bg-[#fbbc0e] text-[#17130a] group-hover:shadow-[0_0_30px_rgba(251,188,14,0.4)]'
                                              : 'border-[#504532] bg-[#201f1f] text-[#e5e2e1] group-hover:border-[#b39452] group-hover:bg-[#29261f] group-hover:text-[#ffd88a] group-hover:shadow-[0_0_25px_rgba(251,188,14,0.2)]'
                                    }`}
                                >
                                    <span className="font-[var(--font-inter)] text-lg font-medium transition-transform duration-500 group-hover:scale-110">
                                        {step.number}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="mt-5 whitespace-nowrap font-[var(--font-inter)] text-base font-medium text-[#e5e2e1] transition-all duration-300 group-hover:text-[#ffd88a] group-hover:-translate-y-0.5">
                                    {step.title}
                                </h3>

                                {/* Description */}
                                <p className="mt-5 font-[var(--font-inter)] text-sm font-medium leading-5 text-[#8f8779] transition-colors duration-300 group-hover:text-[#d4c5ac]">
                                    {step.description}
                                </p>

                                {/* Small accent */}
                                <div className="mt-5 h-[2px] w-0 bg-[#fbbc0e] transition-all duration-500 group-hover:w-8" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
