import Image from 'next/image';

export default function AboutHorizon() {
    return (
        <section className="relative min-h-[500px] overflow-hidden border-b border-[#292929] bg-black sm:min-h-[520px]">
            {/* =====================================================
                BACKGROUND IMAGE
            ===================================================== */}
            <Image
                src="/About_MoveImage.png"
                alt=""
                fill
                sizes="100vw"
                className="object-cover object-center"
            />

            {/* =====================================================
                IMAGE OVERLAY
            ===================================================== */}
            <div className="absolute inset-0 bg-black/60" />

            {/* Bottom dark fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/45" />

            {/* =====================================================
                CONTENT
            ===================================================== */}
            <div className="relative z-10 flex min-h-[500px] items-center justify-center px-6 py-20 sm:min-h-[520px] sm:py-24">
                <div className="mx-auto max-w-[1050px] text-center">
                    {/* Technical Label */}
                    <div className="inline-flex items-center rounded border border-[#806b3d] bg-[#0e0e0e]/70 px-3 py-2 backdrop-blur-sm">
                        <span className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.13em] text-[#fbbc0e] sm:text-[11px]">
                            The Horizon // Forward Momentum
                        </span>
                    </div>

                    {/* Heading */}
                    <h2 className="mx-auto mt-7 max-w-[1000px] font-[var(--font-hanken)] text-[43px] font-bold leading-[1.03] tracking-[-0.04em] text-white sm:text-[52px] lg:text-[58px]">
                        Move from fragmented workflows
                        <br />
                        to connected operations.
                    </h2>

                    {/* Description */}
                    <p className="mx-auto mt-6 max-w-[760px] font-[var(--font-inter)] text-[16px] leading-6 text-[#d4c5ac] sm:text-[17px] sm:leading-7">
                        The future of logistics is not defined by who owns the most trucks, but by
                        who coordinates freight with the greatest clarity, trust, and speed.
                    </p>

                    {/* Bottom Statement */}
                    <div className="mt-8 flex items-center justify-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-[#fbbc0e]" />

                        <span className="font-[var(--font-mono)] text-[9px] font-semibold uppercase tracking-[0.1em] text-[#d4c5ac] sm:text-[10px]">
                            Connecting Regional & National Transportation Corridors
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
