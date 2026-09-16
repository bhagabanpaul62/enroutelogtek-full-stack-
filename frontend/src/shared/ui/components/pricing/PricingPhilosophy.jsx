const principles = [
    {
        number: '01',
        title: 'CLEAR',
        description:
            'Understand exactly what your plan is designed to support. No confusing software tiers that lock away baseline operational tools.',
    },
    {
        number: '02',
        title: 'SCALABLE',
        description:
            'Expand as your business and fleet volume grow. Scale from direct lane bidding to comprehensive multi-party network execution seamlessly.',
    },
    {
        number: '03',
        title: 'ROLE-BASED',
        description:
            'Choose an experience tuned specifically to your position—whether demand creator, carrier, liquidity broker, or vehicle operator.',
    },
];

export default function PricingPhilosophy() {
    return (
        <section className="relative overflow-hidden border-b border-[#222222] bg-black px-6 py-20 sm:py-24 lg:py-28">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fbbc0e]/[0.025] blur-[140px]" />

            <div className="relative mx-auto max-w-6xl">
                {/* Heading */}
                <div className="mx-auto max-w-[900px] text-center">
                    <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#fbbc0e] sm:text-[11px]">
                        Philosophy // Operational Efficiency
                    </p>

                    <h2 className="mt-5 font-[var(--font-hanken)] text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-[#f1efed] sm:text-4xl lg:text-[38px]">
                        You pay for the operation you run—not features you don&apos;t need.
                    </h2>

                    <p className="mx-auto mt-6 max-w-[800px] font-[var(--font-inter)] text-[15px] leading-6 text-[#d4c5ac] sm:text-[16px] sm:leading-7">
                        Enroute is designed around different logistics businesses, allowing the
                        platform experience to align precisely with your role, workflow, and
                        operational scale without forcing every company into a rigid template.
                    </p>
                </div>

                {/* Principle Cards */}
                <div className="mx-auto mt-12 grid max-w-[960px] grid-cols-1 gap-5 md:grid-cols-3">
                    {principles.map((item) => (
                        <article
                            key={item.number}
                            className="group relative min-h-[204px] overflow-hidden rounded-md border border-[#222222] bg-[#111111] p-5 transition-all duration-500 hover:-translate-y-1 hover:border-[#504532] hover:bg-[#151515] hover:shadow-[0_15px_40px_rgba(0,0,0,0.35)]"
                        >
                            {/* Number */}
                            <div className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-[#504532] bg-[#0e0e0e]">
                                <span className="font-[var(--font-mono)] text-[9px] font-bold text-[#fbbc0e]">
                                    {item.number}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="mt-5">
                                <h3 className="font-[var(--font-hanken)] text-[16px] font-bold text-[#e5e2e1]">
                                    {item.title}
                                </h3>

                                <p className="mt-2 font-[var(--font-inter)] text-[12px] leading-5 text-[#d4c5ac] sm:text-[12px]">
                                    {item.description}
                                </p>
                            </div>

                            {/* Hover accent */}
                            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#fbbc0e] transition-all duration-500 group-hover:w-1/2" />
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
