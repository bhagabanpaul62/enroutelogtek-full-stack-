export default function AboutMissionStatement() {
    return (
        <section className="border-b border-[#222222] bg-[#131313] px-6 py-24 sm:py-28 lg:py-32">
            <div className="mx-auto max-w-6xl text-center">
                {/* Yellow Accent */}
                <div className="mx-auto h-[3px] w-10 bg-[#fbbc0e]" />

                {/* Mission Quote */}
                <blockquote className="mx-auto mt-9 max-w-[900px] font-[var(--font-hanken)] text-[29px] font-semibold leading-[1.45] tracking-[-0.025em] text-[#f1efed] sm:text-[36px] sm:leading-[1.4] lg:text-[40px] lg:leading-[1.4]">
                    ”Logistics is not just about moving goods. It is about connecting the
                    businesses, people, vehicles, capacity, and decisions that make movement
                    possible. We are building technology for the businesses behind every move.”
                </blockquote>

                {/* Attribution */}
                <div className="mt-8 flex items-center justify-center gap-3">
                    <span className="h-px w-6 bg-[#806b3d]" />

                    <span className="font-[var(--font-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[#fbbc0e] sm:text-[10px]">
                        The Enroute Logtek Mission
                    </span>

                    <span className="h-px w-6 bg-[#806b3d]" />
                </div>
            </div>
        </section>
    );
}
