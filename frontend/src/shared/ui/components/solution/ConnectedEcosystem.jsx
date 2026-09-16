import { ArrowDownRight } from 'lucide-react';

const roles = [
    {
        number: '01',
        name: 'Customer',
        description: 'Industrial Shippers & Manufacturers',
    },
    {
        number: '02',
        name: 'Transporter',
        description: 'Carriers & Logistics Operators',
    },
    {
        number: '03',
        name: 'Broker',
        description: 'Freight Coordinators & Liquidity Providers',
    },
    {
        number: '04',
        name: 'Fleet Owner',
        description: 'Vehicle Asset Owners & Drivers',
    },
];

export default function ConnectedEcosystem() {
    return (
        <section className="bg-[#131313] px-6 py-24 sm:py-28">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="max-w-4xl">
                    <h2 className="mt-5 font-[var(--font-hanken)] text-4xl font-semibold leading-tight tracking-[-0.025em] text-[#e5e2e1] sm:text-5xl">
                        Different businesses.
                        <br />
                        One connected <span className="text-[#ffd88a]">ecosystem.</span>
                    </h2>

                    <p className="mt-6 max-w-4xl font-[var(--font-inter)] text-base leading-7 text-[#d4c5ac] sm:text-[17px]">
                        Every participant in transportation has different responsibilities. Enroute
                        brings them together without forcing them into the same workflow—ensuring
                        each organization operates with native tools tailored to their position in
                        the freight chain.
                    </p>
                </div>

                {/* Role Cards */}
                <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {roles.map((role) => (
                        <article
                            key={role.number}
                            className="group relative overflow-hidden rounded border border-[#222222] bg-[#111111] p-5 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[#806b3d] hover:bg-[#151515] hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                        >
                            {/* Ambient Glow */}
                            <div className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full bg-[#fbbc0e]/0 blur-3xl transition-all duration-700 group-hover:bg-[#fbbc0e]/[0.08]" />

                            {/* Top Row */}
                            <div className="relative z-10 flex items-center justify-between">
                                <span className="font-[var(--font-mono)] text-[9px] font-medium tracking-[0.12em] text-[#d4c5ac] transition-colors duration-300 group-hover:text-[#fbbc0e]">
                                    ROLE {role.number}
                                </span>

                                <ArrowDownRight
                                    size={16}
                                    strokeWidth={1.5}
                                    aria-hidden="true"
                                    className="text-[#77736d] transition-all duration-300 group-hover:translate-x-1 group-hover:translate-y-1 group-hover:text-[#fbbc0e]"
                                />
                            </div>

                            {/* Role Information */}
                            <div className="relative z-10 mt-4">
                                <h3 className="font-[var(--font-inter)] text-sm font-semibold text-[#e5e2e1] transition-colors duration-300 group-hover:text-[#ffd88a]">
                                    {role.name}
                                </h3>

                                <p className="mt-1 font-[var(--font-inter)] text-xs leading-5 text-[#9c9487] transition-colors duration-300 group-hover:text-[#d4c5ac]">
                                    {role.description}
                                </p>
                            </div>

                            {/* Bottom Accent */}
                            <div className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[#ffd88a] transition-all duration-500 group-hover:w-1/3" />
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
