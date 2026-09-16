import { Handshake, Workflow, ChartNoAxesCombined } from 'lucide-react';

const architectureCards = [
    {
        icon: Handshake,
        title: 'Business Relationships',
        subtitle: "KNOW WHO YOU'RE CONNECTED WITH",
        description:
            'Eliminate cold calls and anonymous capacity. Review company credentials, verified operational status, and historical interaction records before dispatch.',
        system: 'SYS // ENT-IDENTITY-MODULE',
    },
    {
        icon: Workflow,
        title: 'Transportation Workflows',
        subtitle: 'MOVE FROM RFQ TO CONTRACT TO TRIP',
        description:
            'Standardized digital workflows that keep all parties synchronized. No disconnected spreadsheets, fragmented emails, or lost rate negotiations.',
        system: 'SYS // FLOW-PIPELINE-02',
    },
    {
        icon: ChartNoAxesCombined,
        title: 'Operational Visibility',
        subtitle: 'KEEP TRACK OF EXECUTION & ACTIVITY',
        description:
            'Gain transparent oversight across vehicle movements, trip milestones, and commercial agreements with real-time auditability across lanes.',
        system: 'SYS // TELEMETRY-AUDIT-LOG',
    },
];

export default function SystemArchitecture() {
    return (
        <section className="border-t border-[#222222] bg-[#131313] px-6 py-24 sm:py-28 lg:py-32">
            <div className="mx-auto max-w-7xl">
                {/* ================= HEADER ================= */}

                <div className="max-w-4xl">
                    <p className="font-[var(--font-mono)] text-[12px] font-medium uppercase tracking-[0.18em] text-[#fbbc0e]">
                        System Architecture
                    </p>

                    <h2 className="mt-5 font-[var(--font-hanken)] text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-[#e5e2e1] sm:text-5xl">
                        More visibility.
                        <br />
                        Less operational friction.
                    </h2>

                    <p className="mt-5 max-w-3xl font-[var(--font-inter)] text-base leading-6 text-[#d4c5ac] sm:text-[17px] sm:leading-7">
                        Bring transportation workflows together so your team can spend less time
                        coordinating disconnected processes and more time moving business forward.
                    </p>
                </div>

                {/* ================= ARCHITECTURE CARDS ================= */}

                <div className="mt-14 grid gap-6 lg:grid-cols-3">
                    {architectureCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <article
                                key={card.title}
                                className="group relative flex min-h-[314px] flex-col overflow-hidden rounded-md border border-[#222222] bg-[#111111] p-7 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[#806b3d] hover:bg-[#171614] hover:shadow-[0_15px_40px_rgba(0,0,0,0.35)]"
                            >
                                {/* Hover Glow */}

                                <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#fbbc0e]/0 blur-3xl transition-all duration-700 group-hover:bg-[#fbbc0e]/[0.06]" />

                                {/* Icon */}

                                <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded border border-[#292929] bg-[#1a1a1a] transition-all duration-500 group-hover:border-[#806b3d] group-hover:bg-[#201f1f] group-hover:shadow-[0_0_20px_rgba(251,188,14,0.08)]">
                                    <Icon
                                        size={21}
                                        strokeWidth={1.8}
                                        className="text-[#fbbc0e] transition-transform duration-500 group-hover:scale-110"
                                    />
                                </div>

                                {/* Title */}

                                <h3 className="relative z-10 mt-6 font-[var(--font-inter)] text-base font-semibold text-[#e5e2e1] transition-colors duration-300 group-hover:text-[#ffd88a] sm:text-[17px]">
                                    {card.title}
                                </h3>

                                {/* Subtitle */}

                                <p className="relative z-10 mt-2 font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[#fbbc0e]">
                                    {card.subtitle}
                                </p>

                                {/* Description */}

                                <p className="relative z-10 mt-5 font-[var(--font-inter)] text-[13px] leading-5 text-[#d4c5ac] transition-colors duration-300 group-hover:text-[#e5e2e1]">
                                    {card.description}
                                </p>

                                {/* Bottom System Info */}

                                <div className="relative z-10 mt-auto border-t border-[#222222] pt-4">
                                    <span className="font-[var(--font-mono)] text-[9px] font-medium uppercase tracking-[0.08em] text-[#4f6280]">
                                        {card.system}
                                    </span>
                                </div>

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
