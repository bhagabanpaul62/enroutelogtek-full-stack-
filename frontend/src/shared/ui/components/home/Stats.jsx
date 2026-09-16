import AnimatedStat from './AnimatedStat';

export default function Stats() {
    const stats = [
        {
            value: 5000,
            suffix: '+',
            label: 'RFQs Managed',
        },
        {
            value: 1500,
            suffix: '+',
            label: 'Transporters Connected',
        },
        {
            value: 100,
            suffix: 'k+',
            label: 'Trips Processed',
        },
        {
            value: 99.9,
            suffix: '%',
            label: 'Platform Uptime',
        },
    ];

    return (
        <section className="px-6 py-8 sm:py-10">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="flex flex-col items-center text-center lg:items-start lg:text-left"
                    >
                        <p className="font-[var(--font-mono)] text-3xl font-medium text-[#fbbc0e] sm:text-4xl">
                            <AnimatedStat value={stat.value} suffix={stat.suffix} />
                        </p>

                        <div className="mt-2 h-[2px] w-5 bg-[#fbbc0e]" />

                        <p className="mt-2 max-w-[150px] font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.05em] text-[#9c8f78]">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
