import { Network, ArrowUpDown } from 'lucide-react';

const nodes = [
    {
        id: 'customer',
        label: 'NODE 01 // DEMAND',
        title: 'CUSTOMERS',
        description:
            'Industrial manufacturers, enterprises & FMCG shippers generating freight demand.',
    },
    {
        id: 'transporter',
        label: 'NODE 02 // CARRIER',
        title: 'TRANSPORTERS',
        description:
            'Established logistics companies bidding on freight, executing lines and contracting.',
    },
    {
        id: 'fleet',
        label: 'NODE 03 // ASSET OWNERS',
        title: 'FLEET OWNERS',
        description:
            'Vehicle asset owners, fleet masters, and commercial drivers supplying physical wheels.',
    },
];

function NetworkNode({ label, title, description }) {
    return (
        <article className="group relative rounded-md border border-[#222222] bg-[#131313] p-5 transition-all duration-500 hover:-translate-y-1 hover:border-[#806b3d] hover:bg-[#171614] hover:shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
            {/* Hover Glow */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#fbbc0e]/0 blur-2xl transition-all duration-500 group-hover:bg-[#fbbc0e]/[0.08]" />

            {/* Node Header */}
            <div className="relative z-10 flex items-center justify-between">
                <span className="font-[var(--font-mono)] text-[10px] font-medium tracking-[0.1em] text-[#fbbc0e]">
                    {label}
                </span>

                <span className="h-1.5 w-1.5 rounded-full bg-[#fbbc0e] transition-all duration-300 group-hover:scale-125 group-hover:shadow-[0_0_8px_rgba(251,188,14,0.6)]" />
            </div>

            {/* Node Title */}
            <h3 className="relative z-10 mt-4 font-[var(--font-inter)] text-base font-semibold text-[#e5e2e1] transition-colors duration-300 group-hover:text-[#ffd88a]">
                {title}
            </h3>

            {/* Node Description */}
            <p className="relative z-10 mt-2 font-[var(--font-inter)] text-[12px] leading-5 text-[#b8ad99]">
                {description}
            </p>
        </article>
    );
}

export default function EcosystemTopology() {
    const customer = nodes.find((node) => node.id === 'customer');
    const transporter = nodes.find((node) => node.id === 'transporter');
    const fleet = nodes.find((node) => node.id === 'fleet');

    return (
        <section className="border-t border-[#222222] bg-black px-6 py-24 sm:py-28 lg:py-32">
            <div className="mx-auto max-w-7xl">
                {/* ================= HEADER ================= */}

                <div className="text-center">
                    <p className="font-[var(--font-mono)] text-[12px] font-medium uppercase tracking-[0.2em] text-[#fbbc0e]">
                        Ecosystem Topology
                    </p>

                    <h2 className="mx-auto mt-5 max-w-3xl font-[var(--font-hanken)] text-4xl font-semibold leading-tight tracking-[-0.025em] text-[#e5e2e1] sm:text-5xl">
                        Connected by business.
                        <br />
                        Powered by <span className="text-[#ffd88a]">Enroute.</span>
                    </h2>

                    <p className="mx-auto mt-5 max-w-3xl font-[var(--font-inter)] text-base leading-6 text-[#d4c5ac] sm:text-[17px] sm:leading-7">
                        Build relationships that go beyond a single transaction. Discover trusted
                        businesses, establish connections, and create the foundation for long-term
                        logistics partnerships.
                    </p>
                </div>

                {/* ================= NETWORK MATRIX ================= */}

                <div className="mx-auto mt-16 max-w-6xl rounded-lg border border-[#222222] bg-[#131313] p-6 sm:p-8 lg:p-9">
                    {/* Matrix Header */}

                    <div className="flex items-center justify-between">
                        <span className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.12em] text-[#4f6280]">
                            Network Relationship Matrix
                        </span>
                    </div>

                    {/* ================= DESKTOP ================= */}

                    <div className="mt-10 hidden lg:grid lg:grid-cols-[1fr_1.08fr_1fr] lg:gap-7">
                        {/* ================= LEFT COLUMN ================= */}

                        <div className="flex flex-col gap-7">
                            {/* Customer */}

                            <NetworkNode
                                label={customer.label}
                                title={customer.title}
                                description={customer.description}
                            />

                            {/* Transporter */}

                            <NetworkNode
                                label={transporter.label}
                                title={transporter.title}
                                description={transporter.description}
                            />
                        </div>

                        {/* ================= CENTER ================= */}

                        <div className="relative flex items-center">
                            {/* Customer Connector */}

                            <div className="pointer-events-none absolute -left-7 top-[22%] h-px w-7 bg-[#806b3d]/70" />

                            {/* Transporter Connector */}

                            <div className="pointer-events-none absolute -left-7 bottom-[22%] h-px w-7 bg-[#806b3d]/70" />

                            {/* Broker Card */}

                            <article className="group relative flex min-h-[300px] w-full flex-col rounded-md border border-[#9c7400] bg-[#171614] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[#fbbc0e] hover:shadow-[0_0_35px_rgba(251,188,14,0.12)]">
                                {/* Catalyst Badge */}

                                <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-[#fbbc0e] px-5 py-1.5">
                                    <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-black">
                                        Ecosystem Catalyst
                                    </span>
                                </div>

                                {/* Network Icon */}

                                <div className="mx-auto mt-2 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#fbbc0e] bg-[#0e0e0e] transition-all duration-500 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(251,188,14,0.15)]">
                                    <Network
                                        size={27}
                                        strokeWidth={1.5}
                                        className="text-[#fbbc0e]"
                                    />
                                </div>

                                {/* Broker Content */}

                                <div className="mt-5 text-center">
                                    <h3 className="font-[var(--font-hanken)] text-xl font-semibold text-[#e5e2e1]">
                                        BROKERS
                                    </h3>

                                    <p className="mt-1 font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.12em] text-[#fbbc0e]">
                                        Capacity Liquidity Engine
                                    </p>

                                    <p className="mx-auto mt-5 max-w-[290px] font-[var(--font-inter)] text-[12px] leading-5 text-[#b8ad99]">
                                        Brokers bridge and connect across the entire
                                        ecosystem—matching spot demand, backhauls, and regional
                                        supply without operational friction.
                                    </p>
                                </div>

                                {/* Broker Footer */}

                                <div className="mt-auto flex items-center justify-between border-t border-[#2d2921] pt-4">
                                    <span className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.08em] text-[#4f6280]">
                                        Sync Demand
                                    </span>

                                    <span className="text-[8px] text-[#504532]">•</span>

                                    <span className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.08em] text-[#4f6280]">
                                        Pool Capacity
                                    </span>
                                </div>
                            </article>

                            {/* Fleet Connector */}

                            <div className="pointer-events-none absolute -right-7 top-1/2 h-px w-7 bg-[#806b3d]/70" />
                        </div>

                        {/* ================= RIGHT COLUMN ================= */}

                        <div className="flex flex-col gap-7">
                            {/* Fleet Owner */}

                            <NetworkNode
                                label={fleet.label}
                                title={fleet.title}
                                description={fleet.description}
                            />

                            {/* Interoperability */}

                            <div className="rounded border border-[#222222] bg-[#0e0e0e] px-5 py-4 text-center transition-all duration-300 hover:border-[#504532]">
                                <p className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.1em] text-[#4f6280]">
                                    Interoperability Principle
                                </p>

                                <p className="mt-2 font-[var(--font-inter)] text-[11px] leading-5 text-[#d4c5ac]">
                                    Zero forced uniformity: Each business uses custom tools while
                                    sharing a unified verified network.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ================= MOBILE ================= */}

                    <div className="mt-8 space-y-5 lg:hidden">
                        {/* Customer */}

                        <NetworkNode
                            label={customer.label}
                            title={customer.title}
                            description={customer.description}
                        />

                        {/* Connection */}

                        <div className="flex items-center justify-center gap-2">
                            <ArrowUpDown size={12} strokeWidth={1.5} className="text-[#fbbc0e]" />

                            <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[#806b3d]">
                                Direct RFQ & Awards
                            </span>
                        </div>

                        {/* Broker */}

                        <article className="rounded-md border border-[#9c7400] bg-[#171614] p-6">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#fbbc0e] bg-[#0e0e0e]">
                                <Network size={27} strokeWidth={1.5} className="text-[#fbbc0e]" />
                            </div>

                            <div className="mt-5 text-center">
                                <p className="font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.1em] text-[#fbbc0e]">
                                    Ecosystem Catalyst
                                </p>

                                <h3 className="mt-2 font-[var(--font-hanken)] text-xl font-semibold text-[#e5e2e1]">
                                    BROKERS
                                </h3>

                                <p className="mt-1 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[#fbbc0e]">
                                    Capacity Liquidity Engine
                                </p>

                                <p className="mx-auto mt-5 max-w-md font-[var(--font-inter)] text-[12px] leading-5 text-[#b8ad99]">
                                    Brokers bridge and connect across the entire ecosystem—matching
                                    spot demand, backhauls, and regional supply without operational
                                    friction.
                                </p>
                            </div>

                            <div className="mt-6 flex items-center justify-between border-t border-[#2d2921] pt-4">
                                <span className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.08em] text-[#4f6280]">
                                    Sync Demand
                                </span>

                                <span className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.08em] text-[#4f6280]">
                                    Pool Capacity
                                </span>
                            </div>
                        </article>

                        {/* Connection */}

                        <div className="flex items-center justify-center gap-2">
                            <ArrowUpDown size={12} strokeWidth={1.5} className="text-[#fbbc0e]" />

                            <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[#806b3d]">
                                Capacity Allocation
                            </span>
                        </div>

                        {/* Fleet */}

                        <NetworkNode
                            label={fleet.label}
                            title={fleet.title}
                            description={fleet.description}
                        />

                        {/* Transporter */}

                        <NetworkNode
                            label={transporter.label}
                            title={transporter.title}
                            description={transporter.description}
                        />

                        {/* Interoperability */}

                        <div className="rounded border border-[#222222] bg-[#0e0e0e] px-5 py-4 text-center">
                            <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[#4f6280]">
                                Interoperability Principle
                            </p>

                            <p className="mt-2 font-[var(--font-inter)] text-[11px] leading-5 text-[#d4c5ac]">
                                Zero forced uniformity: Each business uses custom tools while
                                sharing a unified verified network.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
