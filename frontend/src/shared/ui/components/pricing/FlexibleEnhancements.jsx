import { Workflow, TrendingUp, Search, UsersRound } from 'lucide-react';

const enhancements = [
    {
        icon: Workflow,
        title: 'Extended Operational Capabilities',
        description:
            'Additional logistics automation rules, multi-point route verification, and multi-depot synchronization.',
    },
    {
        icon: TrendingUp,
        title: 'Advanced Freight Auditing',
        description:
            'Cross-network invoice matching, discrepancy reconciliation, and granular trip cost breakdowns.',
    },
    {
        icon: Search,
        title: 'Expanded Network Directory',
        description:
            'National-scale verified partner search, regional transporter matchmaking, and high-capacity lanes.',
    },
    {
        icon: UsersRound,
        title: 'Enterprise Configuration',
        description:
            'Custom organizational hierarchies, role-level permissions, branch workspaces, and custom SSO.',
    },
];

export default function FlexibleEnhancements() {
    return (
        <section className="relative overflow-hidden border-b border-[#222222] bg-black px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                {/* =====================================================
                    HEADER
                ===================================================== */}
                <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#fbbc0e] sm:text-[11px]">
                            Flexible Enhancements
                        </p>

                        <h2 className="mt-3 font-[var(--font-hanken)] text-3xl font-bold leading-tight tracking-[-0.025em] text-[#f1efed] sm:text-4xl">
                            Extend your operation when you need more
                        </h2>

                        <p className="mt-2 font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px]">
                            Available depending on plan and custom configuration.
                        </p>
                    </div>

                    {/* Talk to Sales */}
                    <a
                        href="/support"
                        className="group inline-flex w-fit items-center gap-2 rounded border border-[#292929] bg-[#111111] px-5 py-3 font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#e5e2e1] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#806b3d] hover:bg-[#171614] hover:text-[#ffd88a]"
                    >
                        <span>Talk to Sales</span>

                        <span className="transition-transform duration-300 group-hover:translate-x-1">
                            →
                        </span>
                    </a>
                </div>

                {/* =====================================================
                    ENHANCEMENT CARDS
                ===================================================== */}
                <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {enhancements.map((item) => {
                        const Icon = item.icon;

                        return (
                            <article
                                key={item.title}
                                className="group relative flex min-h-[190px] flex-col overflow-hidden rounded-md border border-[#222222] bg-[#111111] p-5 transition-all duration-500 hover:-translate-y-1 hover:border-[#504532] hover:bg-[#151515] hover:shadow-[0_15px_40px_rgba(0,0,0,0.35)]"
                            >
                                {/* Icon */}
                                <div className="relative z-10">
                                    <Icon
                                        size={18}
                                        strokeWidth={1.8}
                                        className="text-[#fbbc0e] transition-transform duration-300 group-hover:scale-110"
                                    />
                                </div>

                                {/* Content */}
                                <div className="relative z-10 mt-5">
                                    <h3 className="max-w-[210px] font-[var(--font-hanken)] text-[14px] font-bold leading-5 text-[#e5e2e1]">
                                        {item.title}
                                    </h3>

                                    <p className="mt-2 font-[var(--font-inter)] text-[11px] leading-5 text-[#d4c5ac] sm:text-[12px]">
                                        {item.description}
                                    </p>
                                </div>

                                {/* Bottom Hover Accent */}
                                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#fbbc0e] transition-all duration-500 group-hover:w-1/2" />
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
