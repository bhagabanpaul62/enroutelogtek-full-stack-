import { ChevronDown } from 'lucide-react';

const faqs = [
    {
        question: 'How does Enroute pricing work?',
        answer: 'Enroute pricing is designed around the role and operational requirements of your business. Contact the Enroute team for the pricing configuration applicable to your operation.',
    },
    {
        question: 'Can I change my plan later?',
        answer: 'Plan changes can be discussed based on your business requirements and operational growth. As your freight volume or vehicle network scales, your configuration can be expanded seamlessly.',
    },
    {
        question: 'Do different business types have different pricing?',
        answer: 'Enroute serves customers, transporters, brokers and fleet owners with different workflows, so pricing may be structured around the needs of each business type.',
    },
    {
        question: 'Is annual billing available?',
        answer: 'Annual billing can be offered depending on the selected configuration. Contact the Enroute team for details.',
    },
    {
        question: 'Is there an enterprise option?',
        answer: 'For larger or more complex operations, contact the Enroute team to discuss an appropriate configuration.',
    },
];

export default function PricingFAQ() {
    return (
        <section className="relative overflow-hidden border-b border-[#222222] bg-black px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                {/* =====================================================
                    HEADER
                ===================================================== */}

                <div className="mx-auto max-w-[760px] text-center">
                    <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#fbbc0e] sm:text-[11px]">
                        Pricing // FAQ
                    </p>

                    <h2 className="mt-4 font-[var(--font-hanken)] text-3xl font-bold leading-tight tracking-[-0.025em] text-[#f1efed] sm:text-4xl">
                        Questions before you get started?
                    </h2>

                    <p className="mt-2 font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px]">
                        Key information regarding plan structure, business roles, and operational
                        customization.
                    </p>
                </div>

                {/* =====================================================
                    FAQ LIST
                ===================================================== */}

                <div className="mx-auto mt-10 max-w-[725px] space-y-3">
                    {faqs.map((faq) => (
                        <details
                            key={faq.question}
                            className="group rounded-md border border-[#222222] bg-[#111111] transition-all duration-300 hover:border-[#504532]"
                        >
                            {/* =====================================================
                                QUESTION
                            ===================================================== */}

                            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-4 py-4 marker:hidden sm:px-5 sm:py-5">
                                <span className="font-[var(--font-hanken)] text-[14px] font-bold leading-5 text-[#e5e2e1] sm:text-[15px]">
                                    {faq.question}
                                </span>

                                {/* Chevron Icon */}

                                <ChevronDown
                                    size={18}
                                    strokeWidth={2}
                                    className="shrink-0 text-[#fbbc0e] transition-transform duration-300 group-open:rotate-180"
                                />
                            </summary>

                            {/* =====================================================
                                ANSWER
                            ===================================================== */}

                            <div className="px-4 pb-5 sm:px-5">
                                <p className="border-t border-[#222222] pt-4 font-[var(--font-inter)] text-[12px] leading-5 text-[#d4c5ac] sm:text-[13px] sm:leading-6">
                                    {faq.answer}
                                </p>
                            </div>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
