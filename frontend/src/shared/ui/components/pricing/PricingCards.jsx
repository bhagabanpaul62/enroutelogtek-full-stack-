export default function PricingCards({ role, billing, pricing }) {
    const plans = [
        {
            key: 'start',
            number: '01',
        },
        {
            key: 'grow',
            number: '02',
        },
        {
            key: 'scale',
            number: '03',
        },
    ];

    return (
        <section className="border-b border-[#222222] bg-[#131313]/40 py-12">
            <div className="mx-auto max-w-7xl px-6">
                {/* Selected Role Overview */}
                <div className="mb-10 flex flex-col justify-between gap-5 rounded-md border border-[#222222] bg-[#111111] p-5 md:flex-row md:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#fbbc0e]" />

                            <span className="font-[var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#fbbc0e]">
                                {pricing.badge}
                            </span>
                        </div>

                        <h3 className="mt-2 font-[var(--font-hanken)] text-xl font-bold text-[#e5e2e1] sm:text-2xl">
                            {pricing.heading}
                        </h3>

                        <p className="mt-1 max-w-3xl font-[var(--font-inter)] text-sm leading-6 text-[#d4c5ac]">
                            {pricing.description}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.08em] text-[#78829d]">
                            Configuration:
                        </span>

                        <span className="rounded border border-[#222222] bg-[#0e0e0e] px-3 py-1.5 font-[var(--font-mono)] text-[10px] text-[#e5e2e1]">
                            {billing === 'monthly'
                                ? 'Standard Monthly Workflow'
                                : 'Annual Billing Cycle Enabled'}
                        </span>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3 lg:gap-8">
                    {plans.map((item) => {
                        const plan = pricing.plans[item.key];
                        const recommended = item.key === 'grow';

                        return (
                            <article
                                key={item.key}
                                className={`group relative flex flex-col rounded-lg p-6 transition-all duration-500 ${
                                    recommended
                                        ? 'border-2 border-[#f5b700] bg-[#111111] shadow-[0_0_30px_rgba(245,183,0,0.08)] hover:-translate-y-1 hover:shadow-[0_15px_45px_rgba(245,183,0,0.12)]'
                                        : 'border border-[#222222] bg-[#111111] hover:-translate-y-1 hover:border-[#504532] hover:bg-[#161616]'
                                }`}
                            >
                                {/* Recommended */}
                                {recommended && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-[#f5b700] px-3 py-1 font-[var(--font-mono)] text-[9px] font-bold uppercase tracking-[0.12em] text-black">
                                        Recommended for Growing Operations
                                    </div>
                                )}

                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`font-[var(--font-mono)] text-[11px] font-semibold ${
                                            recommended ? 'text-[#fbbc0e]' : 'text-[#78829d]'
                                        }`}
                                    >
                                        PLAN // {item.number}
                                    </span>

                                    <span
                                        className={`rounded-[2px] border px-2 py-1 font-[var(--font-mono)] text-[9px] uppercase tracking-[0.08em] ${
                                            recommended
                                                ? 'border-[#806b3d] bg-[#fbbc0e]/10 text-[#fbbc0e]'
                                                : 'border-[#222222] bg-[#0e0e0e] text-[#78829d]'
                                        }`}
                                    >
                                        {plan.label}
                                    </span>
                                </div>

                                {/* Plan Name */}
                                <h4 className="mt-5 font-[var(--font-hanken)] text-3xl font-extrabold tracking-[-0.02em] text-[#e5e2e1]">
                                    {plan.name}
                                </h4>

                                {/* Description */}
                                <p className="mt-2 min-h-[58px] font-[var(--font-inter)] text-sm leading-5 text-[#d4c5ac]">
                                    {plan.description}
                                </p>

                                {/* Pricing */}
                                <div
                                    className={`mt-6 rounded border p-4 ${
                                        recommended
                                            ? 'border-[#504532] bg-[#0e0e0e]'
                                            : 'border-[#222222] bg-[#0e0e0e]'
                                    }`}
                                >
                                    <p className="font-[var(--font-hanken)] text-3xl font-extrabold text-[#e5e2e1]">
                                        CUSTOM
                                    </p>

                                    <p
                                        className={`mt-1 font-[var(--font-mono)] text-[12px] leading-4 ${
                                            recommended ? 'text-[#fbbc0e]' : 'text-[#78829d]'
                                        }`}
                                    >
                                        {plan.pricingNote}
                                    </p>
                                </div>

                                {/* CTA */}
                                <a
                                    href="#enterprise-inquiry"
                                    className={`mt-6 block rounded px-4 py-3 text-center font-[var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.1em] transition-all duration-300 ${
                                        recommended
                                            ? 'bg-[#f5b700] text-black hover:bg-[#fbbc0e]'
                                            : 'border border-[#222222] bg-[#0e0e0e] text-[#e5e2e1] hover:border-[#504532] hover:bg-[#1c1b1b] hover:text-[#ffd88a]'
                                    }`}
                                >
                                    {plan.button}
                                </a>

                                {/* Features */}
                                <div className="mt-7 border-t border-[#222222] pt-6">
                                    <p
                                        className={`font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.1em] ${
                                            recommended ? 'text-[#fbbc0e]' : 'text-[#78829d]'
                                        }`}
                                    >
                                        {item.key === 'start'
                                            ? 'Included Workflow Capabilities'
                                            : item.key === 'grow'
                                              ? 'Everything in Start, Plus:'
                                              : 'Everything in Grow, Plus:'}
                                    </p>

                                    <ul className="mt-5 space-y-3">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-3">
                                                <span
                                                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] font-[var(--font-mono)] text-[9px] font-bold ${
                                                        recommended
                                                            ? 'border border-[#f5b700] bg-[#fbbc0e]/10 text-[#fbbc0e]'
                                                            : 'border border-[#504532] bg-[#0e0e0e] text-[#fbbc0e]'
                                                    }`}
                                                >
                                                    ✓
                                                </span>

                                                <span className="font-[var(--font-inter)] text-[13px] leading-5 text-[#d4c5ac]">
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Bottom Config */}
                                <div
                                    className={`mt-auto flex items-center justify-between border-t pt-5 ${
                                        recommended ? 'border-[#504532]/60' : 'border-[#222222]'
                                    }`}
                                >
                                    <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.08em] text-[#78829d]">
                                        CONFIG: {plan.config}
                                    </span>

                                    <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.08em] text-[#fbbc0e]">
                                        {plan.tier}
                                    </span>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {/* Transparency Note */}
                <p className="mt-8 text-center font-[var(--font-mono)] text-[12px] leading-5 text-[#78829d]">
                    Pricing is tailored to your business profile, operating cadence, and network
                    volume. No unexpected add-on penalties.
                </p>
            </div>
        </section>
    );
}
