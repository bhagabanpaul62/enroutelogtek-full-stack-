import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const growthSteps = [
    {
        number: '01',
        title: 'DISCOVER',
        description:
            'Find relevant logistics businesses across corridors, locations, and asset classes using unique Enroute Company IDs.',
    },
    {
        number: '02',
        title: 'CONNECT',
        description:
            'Establish verified B2B relationships requiring mutual business confirmation before transactions commence.',
    },
    {
        number: '03',
        title: 'GROW',
        description:
            'Turn vetted business relationships into repeatable contract volumes, consistent loads, and predictable revenue.',
    },
];

export default function StrategicExpansion() {
    return (
        <section className="border-t border-[#222222] bg-black px-6 py-24 sm:py-28 lg:py-32">
            <div className="mx-auto max-w-7xl">
                {/* Main Content */}
                <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
                    {/* ================= LEFT CONTENT ================= */}

                    <div>
                        {/* Eyebrow */}
                        <p className="font-[var(--font-mono)] text-[12px] font-medium uppercase tracking-[0.18em] text-[#fbbc0e]">
                            Strategic Expansion
                        </p>

                        {/* Heading */}
                        <h2 className="mt-5 max-w-2xl font-[var(--font-hanken)] text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-[#e5e2e1] sm:text-5xl">
                            Your next business
                            <br className="hidden sm:block" />
                            relationship is already
                            <br className="hidden sm:block" />
                            moving.
                        </h2>

                        {/* Description */}
                        <p className="mt-6 max-w-xl font-[var(--font-inter)] text-base leading-6 text-[#d4c5ac] sm:text-[17px] sm:leading-7">
                            Discover companies across the logistics ecosystem and build the
                            professional relationships that keep transportation moving. Move beyond
                            disconnected broker calls to a trusted enterprise network.
                        </p>

                        {/* Growth Steps */}
                        <div className="mt-8 space-y-6">
                            {growthSteps.map((step) => (
                                <div key={step.number} className="group flex gap-4">
                                    {/* Number */}
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#292929] bg-[#111111] transition-all duration-300 group-hover:border-[#806b3d] group-hover:bg-[#171614]">
                                        <span className="font-[var(--font-mono)] text-[10px] font-medium text-[#fbbc0e]">
                                            {step.number}
                                        </span>
                                    </div>

                                    {/* Text */}
                                    <div className="pt-0.5">
                                        <h3 className="font-[var(--font-inter)] text-lg font-semibold text-[#e5e2e1] transition-colors duration-300 group-hover:text-[#ffd88a] sm:text-base md:text-lg">
                                            {step.title}
                                        </h3>

                                        <p className="mt-1.5 max-w-xl font-[var(--font-inter)] text-[13px] leading-5 text-[#b8ad99] sm:text-md sm:leading-5 ">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <a
                            href="/register"
                            className="group mt-8 inline-flex h-12 items-center gap-3 rounded border border-[#292929] bg-[#111111] px-5 font-[var(--font-inter)] text-sm font-semibold text-[#e5e2e1] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#806b3d] hover:bg-[#171614] hover:text-[#ffd88a] hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                        >
                            <span>Explore the Network</span>

                            <ArrowRight
                                size={16}
                                strokeWidth={1.8}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </a>
                    </div>

                    {/* ================= RIGHT VISUAL ================= */}

                    <div className="group relative">
                        {/* Ambient Glow */}
                        <div className="pointer-events-none absolute -inset-4 rounded-xl bg-[#fbbc0e]/0 blur-3xl transition-all duration-700 group-hover:bg-[#fbbc0e]/[0.05]" />

                        {/* Image Card */}
                        <div className="relative overflow-hidden rounded-md bg-[#111111] ring-1 ring-[#222222] transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-[#fbbc0e] group-hover:shadow-[0_0_40px_rgba(251,188,14,0.16)]">
                            {/* Image */}
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <Image
                                    src="/solution_ExpandImage.png"
                                    alt="Enroute logistics business network expansion"
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 620px"
                                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                                />

                                {/* Image Overlay */}
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
