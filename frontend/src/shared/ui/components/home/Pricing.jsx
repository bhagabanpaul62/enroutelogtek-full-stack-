import { Check } from 'lucide-react';

const plans = [
    {
        name: 'Starter',
        price: '$499',
        period: '/mo',
        features: [
            'Up to 50 RFQs/mo',
            '100 Verified Transporters',
            'Live Spot Bidding',
            'Standard GPS Tracking',
        ],
        button: 'Get Started',
    },
    {
        name: 'Professional',
        price: '$1,299',
        period: '/mo',
        popular: true,
        features: [
            'Unlimited RFQs',
            'Priority Carrier Network',
            'Automated Award Engine',
            'OCR Document Verification',
            'API Integrations',
        ],
        button: 'Request Demo',
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        features: [
            'Multi-Region Deployment',
            'Dedicated Account Manager',
            'Custom ERP Connectors',
            'White-label Dashboard',
        ],
        button: 'Contact Sales',
    },
];

export default function Pricing() {
    return (
        <section className="bg-black px-6 py-24 sm:py-28">
            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <div className="text-center">
                    <h2 className="font-[var(--font-hanken)] text-3xl font-semibold leading-tight text-[#e5e2e1] sm:text-4xl">
                        Transparent Pricing for Scalable Operations
                    </h2>

                    <p className="mx-auto mt-4 max-w-2xl font-[var(--font-inter)] text-sm leading-5 text-[#b8ad99]">
                        Select the plan that fits your logistics volume. Custom enterprise options
                        available for high-capacity shippers.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="mt-20 grid items-stretch gap-6 lg:grid-cols-3 lg:gap-5">
                    {plans.map((plan) => (
                        <article
                            key={plan.name}
                            className={`group relative flex min-h-[378px] flex-col overflow-visible rounded-lg p-8 transition-all duration-500 ease-out ${
                                plan.popular
                                    ? 'border-2 border-[#fbbc0e] bg-[#111111] shadow-[0_0_30px_rgba(251,188,14,0.06)] hover:-translate-y-1 hover:shadow-[0_12px_45px_rgba(251,188,14,0.12)]'
                                    : 'border border-[#222222] bg-[#111111] hover:-translate-y-1 hover:border-[#6f5b35] hover:bg-[#151515] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]'
                            }`}
                        >
                            {/* Ambient Glow */}
                            <div
                                className={`pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full blur-3xl transition-all duration-700 ${
                                    plan.popular
                                        ? 'bg-[#fbbc0e]/[0.07] group-hover:bg-[#fbbc0e]/[0.14]'
                                        : 'bg-[#fbbc0e]/0 group-hover:bg-[#fbbc0e]/[0.06]'
                                }`}
                            />

                            {/* Bottom Glow */}
                            <div className="pointer-events-none absolute -bottom-16 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-[#fbbc0e]/0 blur-3xl transition-all duration-700 group-hover:bg-[#fbbc0e]/[0.06]" />

                            {/* Most Popular Badge */}
                            {plan.popular && (
                                <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#fbbc0e] px-5 py-2 shadow-[0_0_20px_rgba(251,188,14,0.2)] transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(251,188,14,0.35)]">
                                    <span className="font-[var(--font-mono)] text-[10px] font-semibold tracking-[0.08em] text-black">
                                        MOST POPULAR
                                    </span>
                                </div>
                            )}

                            {/* Plan Name */}
                            <h3 className="relative z-10 font-[var(--font-inter)] text-sm font-semibold text-[#e5e2e1] transition-colors duration-300 group-hover:text-[#ffd88a]">
                                {plan.name}
                            </h3>

                            {/* Price */}
                            <div className="relative z-10 mt-3 flex items-baseline">
                                <span className="font-[var(--font-hanken)] text-3xl font-bold text-[#e5e2e1] transition-colors duration-300 group-hover:text-[#fff0c2] sm:text-4xl">
                                    {plan.price}
                                </span>

                                {plan.period && (
                                    <span className="ml-1 font-[var(--font-inter)] text-sm text-[#b8ad99]">
                                        {plan.period}
                                    </span>
                                )}
                            </div>

                            {/* Features */}
                            <ul className="relative z-10 mt-7 space-y-4">
                                {plan.features.map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-center gap-3 font-[var(--font-inter)] text-sm text-[#d4c5ac] transition-colors duration-300 group-hover:text-[#e5e2e1]"
                                    >
                                        <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full border border-[#806b3d] transition-all duration-300 group-hover:border-[#ffd88a] group-hover:bg-[#fbbc0e]">
                                            <Check
                                                size={8}
                                                strokeWidth={2.5}
                                                className="text-[#ffd88a] transition-colors duration-300 group-hover:text-black"
                                            />
                                        </span>

                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <a
                                href="/register"
                                className={`relative z-10 mt-auto flex h-11 items-center justify-center rounded border font-[var(--font-inter)] text-sm font-medium transition-all duration-300 ${
                                    plan.popular
                                        ? 'border-[#fbbc0e] bg-[#fbbc0e] text-black hover:bg-[#ffd88a] hover:shadow-[0_0_20px_rgba(251,188,14,0.2)]'
                                        : 'border-[#222222] bg-transparent text-[#e5e2e1] hover:border-[#806b3d] hover:bg-[#191816] hover:text-[#ffd88a]'
                                }`}
                            >
                                {plan.button}
                            </a>

                            {/* Bottom Accent */}
                            <div
                                className={`absolute bottom-0 left-1/2 h-[2px] -translate-x-1/2 bg-[#ffd88a] transition-all duration-500 ${
                                    plan.popular
                                        ? 'w-[35%] group-hover:w-[60%]'
                                        : 'w-0 group-hover:w-[40%]'
                                }`}
                            />
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
