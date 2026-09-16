import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const features = [
    'Manage vehicle rosters & fitness',
    'Manage driver rosters & assignments',
    'Receive pre-allocated loads',
    'Accept direct transportation work',
    'Execute high-efficiency trips',
    'Transparent trip earnings tracker',
    'Build dependable business connections',
];

export default function FleetOwnerSolution() {
    return (
        <section className="border-t border-[#222222] bg-[#131313] px-6 py-24 sm:py-28 lg:py-32">
            <div className="mx-auto max-w-7xl">
                {/* Main Content */}
                <div className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
                    {/* Left Visual */}
                    <div className="group relative">
                        {/* Hover Glow */}
                        <div className="pointer-events-none absolute -inset-2 rounded-lg bg-[#fbbc0e]/0 blur-xl transition-all duration-500 group-hover:bg-[#fbbc0e]/20" />

                        {/* Image Card */}
                        <div className="relative overflow-hidden rounded-md bg-[#111111] ring-1 ring-[#222222] transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:ring-2 group-hover:ring-[#fbbc0e] group-hover:shadow-[0_0_35px_rgba(251,188,14,0.20)]">
                            {/* Image */}
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <Image
                                    src="/solution_TruckRentImage.png"
                                    alt="EnrouteLogTech logistics operations"
                                    fill
                                    priority
                                    sizes="(max-width: 1024px) 100vw, 560px"
                                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                                />

                                {/* Image Overlay */}
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                            </div>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div>
                        {/* Eyebrow */}
                        <div className="flex items-center gap-3">
                            <span className="rounded border border-[#292929] bg-[#111111] px-2.5 py-1.5">
                                <span className="font-[var(--font-mono)] text-[9px] font-semibold uppercase tracking-[0.1em] text-[#fbbc0e]">
                                    04 // Fleet Owner Solution
                                </span>
                            </span>

                            <span className="font-[var(--font-mono)] text-[9px] font-medium uppercase tracking-[0.1em] text-[#4f6280]">
                                Asset Deployment & Earnings
                            </span>
                        </div>

                        {/* Heading */}
                        <h2 className="mt-6 max-w-2xl font-[var(--font-hanken)] text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-[#e5e2e1] sm:text-5xl lg:text-[48px] lg:leading-[1.08]">
                            Put your vehicles to work.
                        </h2>

                        {/* Description */}
                        <p className="mt-6 max-w-2xl font-[var(--font-inter)] text-base leading-6 text-[#d4c5ac] sm:text-[17px] sm:leading-7">
                            Connect directly with transporters and brokers, receive verified
                            transportation opportunities, manage drivers and vehicle readiness,
                            execute trips, and track earnings reliably.
                        </p>

                        {/* Features */}
                        <div className="mt-7 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                            {features.map((feature) => (
                                <div key={feature} className="group flex items-start gap-2.5">
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-[#fbbc0e] transition-all duration-300 group-hover:scale-125 group-hover:shadow-[0_0_8px_rgba(251,188,14,0.5)]" />

                                    <span className="font-[var(--font-inter)] text-xs leading-5 text-[#d4c5ac] transition-colors duration-300 group-hover:text-[#e5e2e1]">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <a
                            href="#"
                            className="group mt-7 inline-flex items-center gap-2 font-[var(--font-inter)] text-sm font-semibold text-[#fbbc0e] transition-colors duration-300 hover:text-[#ffd88a]"
                        >
                            <span>Solutions for Fleet Owners</span>

                            <ArrowRight
                                size={17}
                                strokeWidth={2}
                                aria-hidden="true"
                                className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
