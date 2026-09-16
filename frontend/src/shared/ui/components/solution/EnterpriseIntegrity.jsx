import { Blocks, ShieldCheck, LockKeyhole, Network, Eye } from 'lucide-react';

const integrityFeatures = [
    {
        icon: Blocks,
        title: 'Business-First Workflows',
        description: 'Designed specifically for freight commercial contracting.',
    },
    {
        icon: ShieldCheck,
        title: 'Company Verification',
        description: 'Enroute ID registration ensures genuine business counterparts.',
    },
    {
        icon: LockKeyhole,
        title: 'Role-Based Access',
        description: 'Granular permissions tailored to each ecosystem stakeholder.',
    },
    {
        icon: Network,
        title: 'Structured Relationships',
        description: 'Governed B2B network links with mutual approval controls.',
    },
    {
        icon: Eye,
        title: 'Operational Visibility',
        description: 'Unbroken lifecycle traceability from bid to delivery completion.',
    },
];

export default function EnterpriseIntegrity() {
    return (
        <section className="border-t border-[#222222] bg-black px-6 py-24 sm:py-28 lg:py-32">
            <div className="mx-auto max-w-7xl">
                {/* ================= HEADER ================= */}

                <div className="mx-auto max-w-3xl text-center">
                    <p className="font-[var(--font-mono)] text-[12px] font-medium uppercase tracking-[0.18em] text-[#fbbc0e]">
                        Enterprise Integrity
                    </p>

                    <h2 className="mt-5 font-[var(--font-hanken)] text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-[#e5e2e1] sm:text-5xl">
                        Built for businesses that move the
                        <br className="hidden sm:block" />
                        world.
                    </h2>

                    <p className="mx-auto mt-5 max-w-2xl font-[var(--font-inter)] text-base leading-6 text-[#d4c5ac] sm:text-[17px] sm:leading-7">
                        Enroute is designed around the realities of professional logistics—multiple
                        businesses, complex relationships, transportation capacity, and operational
                        execution.
                    </p>
                </div>

                {/* ================= FEATURE CARDS ================= */}

                <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {integrityFeatures.map((feature) => {
                        const Icon = feature.icon;

                        return (
                            <article
                                key={feature.title}
                                className="group relative flex min-h-[130px] flex-col items-center overflow-hidden rounded-md border border-[#222222] bg-[#111111] px-5 py-6 text-center transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[#806b3d] hover:bg-[#171614] hover:shadow-[0_12px_35px_rgba(0,0,0,0.35)]"
                            >
                                {/* Hover Glow */}

                                <div className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-[#fbbc0e]/0 blur-3xl transition-all duration-700 group-hover:bg-[#fbbc0e]/[0.08]" />

                                {/* Icon */}

                                <div className="relative z-10 flex h-12 w-12 items-center justify-center">
                                    <Icon
                                        size={20}
                                        strokeWidth={1.8}
                                        className="text-[#fbbc0e] transition-all duration-300 group-hover:scale-110 group-hover:text-[#ffd88a]"
                                    />
                                </div>

                                {/* Title */}

                                <h3 className="relative z-10 mt-5 font-[var(--font-inter)] text-[13px] font-semibold text-[#e5e2e1] transition-colors duration-300 group-hover:text-[#ffd88a] sm:text-[13px]">
                                    {feature.title}
                                </h3>

                                {/* Description */}

                                <p className="relative z-10 mt-2 max-w-[190px] font-[var(--font-inter)] text-[12px] leading-4 text-[#b8ad99] transition-colors duration-300 group-hover:text-[#d4c5ac]">
                                    {feature.description}
                                </p>

                                {/* Bottom Accent */}

                                <div className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[#ffd88a] transition-all duration-500 group-hover:w-1/2" />
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
