import { Truck, Container, ArrowLeftRight, BusFront } from 'lucide-react';

const roles = [
    {
        id: 'customers',
        icon: Truck,
        label: 'Customers (Shippers)',
    },
    {
        id: 'transporters',
        icon: Container,
        label: 'Transporters (Carriers)',
    },
    {
        id: 'brokers',
        icon: ArrowLeftRight,
        label: 'Brokers (Coordinators)',
    },
    {
        id: 'fleet-owners',
        icon: BusFront,
        label: 'Fleet Owners (Asset Operators)',
    },
];

export default function PricingRoleSelector({ activeRole, setActiveRole, billing, setBilling }) {
    return (
        <section id="role-pricing" className="bg-black px-6 py-16 sm:py-20 lg:py-24">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="font-[var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#fbbc0e]">
                            Step 01 // Choose Your Business Type
                        </p>

                        <h2 className="mt-4 font-[var(--font-hanken)] text-3xl font-semibold leading-tight tracking-[-0.025em] text-[#e5e2e1] sm:text-4xl">
                            Select your role in the logistics ecosystem
                        </h2>

                        <p className="mt-2 font-[var(--font-inter)] text-[15px] leading-6 text-[#8f8779]">
                            Pricing structure, workflow tools, and operational capabilities adapt
                            automatically.
                        </p>
                    </div>

                    {/* Billing */}
                    <div className="flex w-fit items-center rounded border border-[#292929] bg-[#111111] p-1">
                        <button
                            type="button"
                            onClick={() => setBilling('monthly')}
                            className={`rounded px-5 py-2.5 font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] transition-all duration-300 ${
                                billing === 'monthly'
                                    ? 'border border-[#292929] bg-[#111111] text-[#e5e2e1]'
                                    : 'border border-transparent text-[#526681] hover:text-[#ffd88a]'
                            }`}
                        >
                            Monthly Billing
                        </button>

                        <button
                            type="button"
                            onClick={() => setBilling('annual')}
                            className={`rounded px-5 py-2.5 font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] transition-all duration-300 ${
                                billing === 'annual'
                                    ? 'border border-[#806b3d] bg-[#fbbc0e]/10 text-[#fbbc0e]'
                                    : 'border border-transparent text-[#526681] hover:text-[#ffd88a]'
                            }`}
                        >
                            Annual Billing
                        </button>

                        <span className="ml-1 rounded border border-[#806b3d] bg-[#fbbc0e]/10 px-2.5 py-1.5 font-[var(--font-mono)] text-[9px] font-semibold uppercase tracking-[0.06em] text-[#fbbc0e]">
                            Save
                        </span>
                    </div>
                </div>

                {/* Roles */}
                <div className="mt-10 grid border-b border-[#292929] lg:grid-cols-4">
                    {roles.map((role) => {
                        const Icon = role.icon;
                        const active = activeRole === role.id;

                        return (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => setActiveRole(role.id)}
                                className={`group relative flex min-h-[64px] items-center gap-3 px-5 py-5 text-left transition-all duration-300 ${
                                    active ? 'bg-[#111111]' : 'bg-transparent hover:bg-[#111111]'
                                }`}
                            >
                                <Icon
                                    size={18}
                                    strokeWidth={1.7}
                                    className={`shrink-0 transition-colors duration-300 ${
                                        active
                                            ? 'text-[#fbbc0e]'
                                            : 'text-[#526681] group-hover:text-[#ffd88a]'
                                    }`}
                                />

                                <span
                                    className={`font-[var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.08em] transition-colors duration-300 ${
                                        active
                                            ? 'text-[#fbbc0e]'
                                            : 'text-[#526681] group-hover:text-[#d4c5ac]'
                                    }`}
                                >
                                    {role.label}
                                </span>

                                {active && (
                                    <span className="ml-auto rounded border border-[#806b3d] bg-[#fbbc0e]/10 px-2.5 py-1 font-[var(--font-mono)] text-[8px] font-semibold uppercase tracking-[0.06em] text-[#fbbc0e]">
                                        Active
                                    </span>
                                )}

                                <span
                                    className={`absolute bottom-[-1px] left-0 h-[2px] bg-[#fbbc0e] transition-all duration-300 ${
                                        active ? 'w-full' : 'w-0 group-hover:w-full'
                                    }`}
                                />
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
