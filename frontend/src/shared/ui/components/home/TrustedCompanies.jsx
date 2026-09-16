export default function TrustedCompanies() {
    const companies = ['TATA STEEL', 'JSW', 'UltraTech', 'ITC', 'Nestle', 'Reliance'];

    return (
        <section className="bg-[#131313] px-6 py-12">
            <div className="mx-auto max-w-7xl">
                {/* Section Label */}
                <p className="text-center font-[var(--font-mono)] text-[12px] font-medium uppercase tracking-[0.2em] text-[#cfc2ad]">
                    Trusted by Global Industry Leaders
                </p>

                {/* Companies */}
                <div className="mt-8 grid grid-cols-2 items-center gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                    {companies.map((company) => (
                        <div
                            key={company}
                            className="text-center font-[var(--font-hanken)] text-2xl font-semibold text-[#9c8f78] transition-colors duration-200 hover:text-[#e5e2e1]"
                        >
                            {company}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
