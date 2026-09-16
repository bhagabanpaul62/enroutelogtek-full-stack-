import {
    FileText,
    Network,
    Gavel,
    FilePenLine,
    Truck,
    CloudUpload,
    ArrowRight,
} from 'lucide-react';

export default function OperatingSystem() {
    const features = [
        {
            icon: FileText,
            title: 'RFQ Management',
            description:
                'Automated RFQ creation with multi-line support and vendor prioritization.',
            number: '01',
            pattern: 'rfq',
            span: 'lg:col-span-4',
        },
        {
            icon: Network,
            title: 'Transporter Network',
            description: 'Verified network of premium carriers with performance rating systems.',
            number: '02',
            pattern: 'network',
            span: 'lg:col-span-4',
        },
        {
            icon: Gavel,
            title: 'Live Bidding',
            description: 'Real-time auction engine for spot and contract freight optimization.',
            number: '03',
            pattern: 'bidding',
            span: 'lg:col-span-4',
        },
        {
            icon: FilePenLine,
            title: 'Contract Management',
            description:
                'Digital repository for SLAs, dynamic pricing contracts, and compliance tracking.',
            number: '04',
            pattern: 'contract',
            span: 'lg:col-span-6',
        },
        {
            icon: Truck,
            title: 'Trip Management',
            description: 'Full lifecycle tracking from loading to final destination.',
            number: '05',
            pattern: 'trip',
            span: 'lg:col-span-3',
        },
        {
            icon: CloudUpload,
            title: 'Document Management',
            description: 'OCR-powered automated proof of delivery and invoice verification.',
            number: '06',
            pattern: 'document',
            span: 'lg:col-span-3',
        },
    ];

    return (
        <section id="platform" className="bg-[#131313] px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-7xl">
                {/* Heading */}
                <div>
                    <h2 className="font-[var(--font-hanken)] text-3xl font-bold leading-tight text-[#e5e2e1] sm:text-4xl">
                        The Operating System for Freight
                    </h2>

                    <div className="mt-4 h-[4px] w-[84px] bg-[#ffd88a]" />
                </div>

                {/* Cards */}
                <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
                    {features.map((feature) => {
                        const Icon = feature.icon;

                        return (
                            <article
                                key={feature.title}
                                className={`group relative min-h-[315px] overflow-hidden rounded-lg border border-[#292722] bg-[#0f0f0e] p-8 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[#806b3d] hover:shadow-[0_18px_50px_rgba(0,0,0,0.45)] ${feature.span}`}
                            >
                                {/* Ambient glow */}
                                <div className="pointer-events-none absolute -bottom-20 -right-10 h-44 w-44 rounded-full bg-[#fbbc0e]/[0.07] blur-3xl transition-all duration-700 group-hover:bg-[#fbbc0e]/[0.16]" />

                                {/* Card number */}
                                <span className="absolute right-7 top-6 font-[var(--font-mono)] text-xs tracking-wider text-[#6d6250] transition-colors duration-500 group-hover:text-[#b49a61]">
                                    {feature.number}
                                </span>

                                {/* Icon */}
                                <div className="relative flex h-[82px] w-[82px] items-center justify-center rounded-2xl border border-[#514731] bg-gradient-to-br from-[#27231b] to-[#11110f] shadow-[inset_0_0_20px_rgba(251,188,14,0.04)] transition-all duration-500 group-hover:border-[#9c7e42] group-hover:shadow-[0_0_30px_rgba(251,188,14,0.13)]">
                                    <Icon
                                        size={38}
                                        strokeWidth={1.6}
                                        className="text-[#ffd88a] transition-transform duration-500 group-hover:scale-110"
                                    />

                                    {/* Icon glow */}
                                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[#fbbc0e]/[0.03] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
                                </div>

                                {/* Content */}
                                <div className="relative mt-7">
                                    <h3 className="font-[var(--font-hanken)] text-xl font-semibold text-[#e5e2e1] transition-colors duration-300 group-hover:text-[#fff0c2]">
                                        {feature.title}
                                    </h3>

                                    <p className="mt-3 max-w-[440px] font-[var(--font-inter)] text-sm leading-6 text-[#b8ad99]">
                                        {feature.description}
                                    </p>
                                </div>

                                {/* Learn more */}
                                <div className="absolute bottom-7 left-8 flex items-center gap-4">
                                    <span className="font-[var(--font-inter)] text-sm font-semibold text-[#ffd88a]">
                                        Learn more
                                    </span>

                                    <span className="h-px w-12 bg-[#806b3d] transition-all duration-500 group-hover:w-16" />

                                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#806b3d] transition-all duration-500 group-hover:border-[#ffd88a] group-hover:bg-[#fbbc0e] group-hover:text-black">
                                        <ArrowRight
                                            size={16}
                                            strokeWidth={1.8}
                                            className="text-[#ffd88a] transition-all duration-500 group-hover:text-black"
                                        />
                                    </span>
                                </div>

                                {/* Bottom golden light */}
                                <div className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-[#ffd88a] shadow-[0_0_20px_4px_rgba(255,216,138,0.35)] transition-all duration-700 group-hover:w-[70%]" />

                                {/* Subtle top highlight */}
                                <div className="pointer-events-none absolute left-8 right-8 top-0 h-px bg-gradient-to-r from-transparent via-[#806b3d]/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
