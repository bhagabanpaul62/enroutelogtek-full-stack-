import {
    Factory,
    Compass,
    ShoppingBag,
    FlaskConical,
    Building2,
    Store,
    CarFront,
} from 'lucide-react';

const industries = [
    {
        icon: Factory,
        title: 'STEEL',
    },
    {
        icon: Compass,
        title: 'CEMENT',
    },
    {
        icon: ShoppingBag,
        title: 'FMCG',
    },
    {
        icon: FlaskConical,
        title: 'CHEMICAL',
    },
    {
        icon: Building2,
        title: 'MFG',
    },
    {
        icon: Store,
        title: 'RETAIL',
    },
    {
        icon: CarFront,
        title: 'AUTOMOTIVE',
    },
];

export default function Industries() {
    return (
        <section className="bg-[#131313] px-6 py-24 sm:py-28">
            <div className="mx-auto max-w-7xl">
                {/* Heading */}
                <h2 className="font-[var(--font-hanken)] text-3xl font-semibold leading-tight text-[#e5e2e1] sm:text-4xl">
                    Optimized for Your Industry
                </h2>

                {/* Industries */}
                <div className="mt-24 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-7 lg:gap-5">
                    {industries.map((industry) => {
                        const Icon = industry.icon;

                        return (
                            <article
                                key={industry.title}
                                className="group relative flex h-[196px] flex-col items-center justify-between overflow-hidden border border-[#222222] bg-[#131313] px-4 py-11 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[#6f5b35] hover:bg-[#151515] hover:shadow-[0_12px_35px_rgba(0,0,0,0.35)]"
                            >
                                {/* Soft background glow */}
                                <div className="pointer-events-none absolute -top-12 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-[#fbbc0e]/0 blur-3xl transition-all duration-700 group-hover:bg-[#fbbc0e]/10" />

                                {/* Icon glow */}
                                <div className="pointer-events-none absolute top-10 h-12 w-12 rounded-full bg-[#fbbc0e]/0 blur-xl transition-all duration-500 group-hover:bg-[#fbbc0e]/20" />

                                {/* Icon */}
                                <Icon
                                    size={36}
                                    strokeWidth={1.7}
                                    className="relative z-10 text-[#e5e2e1] transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-1 group-hover:text-[#ffd88a]"
                                />

                                {/* Industry Name */}
                                <h3 className="relative z-10 font-[var(--font-mono)] text-xs font-medium tracking-[0.05em] text-[#e5e2e1] transition-all duration-300 group-hover:text-[#ffd88a]">
                                    {industry.title}
                                </h3>

                                {/* Bottom accent */}
                                <div className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[#ffd88a] shadow-[0_0_14px_rgba(255,216,138,0.4)] transition-all duration-500 group-hover:w-1/2" />
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
