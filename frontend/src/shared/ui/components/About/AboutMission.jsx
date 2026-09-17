export default function AboutMission() {
    return (
        <section className="border-b border-[#292929] bg-[#131313] px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-5xl">
                <p className="mx-auto max-w-[980px] text-center font-[var(--font-hanken)] text-[30px] font-medium leading-[1.18] tracking-[-0.025em] text-[#f1efed] sm:text-[38px] lg:text-[42px]">
                    Every shipment depends on a{' '}
                    <span className="text-[#fbbc0e] underline decoration-[#806b3d] decoration-2 underline-offset-8">
                        network
                    </span>{' '}
                    of businesses{' '}
                    <span className="text-[#fbbc0e] underline decoration-[#806b3d] decoration-2 underline-offset-8">
                        working together.
                    </span>{' '}
                    Enroute brings those businesses closer together through technology—creating a
                    foundation for better relationships, better coordination, and better
                    transportation execution.
                </p>
            </div>
        </section>
    );
}
