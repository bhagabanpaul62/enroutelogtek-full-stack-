import { ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
    {
        question: 'How do I get started with Enroute?',
        answer: 'Start by registering your business and providing the required company information. Your experience is then based on your business role within the Enroute ecosystem.',
    },
    {
        question: 'What types of businesses can use Enroute?',
        answer: 'Enroute is designed for Customers, Transporters, Brokers and Fleet Owners, with workflows aligned to each role.',
    },
    {
        question: 'How can I get help with my account?',
        answer: 'Use the support resources for account and access guidance, or contact the Enroute support team for assistance.',
    },
    {
        question: 'Where can I learn about the Company Network?',
        answer: 'The Network section provides guidance on discovering businesses and building professional company relationships through Enroute.',
    },
    {
        question: 'How do I get help with transportation workflows?',
        answer: 'Explore the transportation workflow resources for guidance on RFQs, bidding, contracts, fleet operations, trips, and related logistics processes.',
    },
];

export default function SupportFAQ() {
    return (
        <section className="relative overflow-hidden border-b border-[#222222] bg-[#0e0e0e] px-6 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <div className="mx-auto max-w-[800px] text-center">
                    <p className="font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#fbbc0e] sm:text-[11px]">
                        Common Questions
                    </p>

                    <h2 className="mt-4 font-[var(--font-hanken)] text-3xl font-bold leading-tight tracking-[-0.025em] text-[#f1efed] sm:text-4xl">
                        Need a quick answer?
                    </h2>

                    <p className="mt-2 font-[var(--font-inter)] text-[14px] leading-6 text-[#d4c5ac] sm:text-[15px]">
                        Clear responses to frequent inquiries regarding onboarding, architecture,
                        and network relationships.
                    </p>
                </div>

                {/* FAQ List */}
                <div className="mx-auto mt-10 max-w-[725px] space-y-2.5">
                    {faqs.map((faq) => (
                        <details
                            key={faq.question}
                            className="group overflow-hidden rounded-md border border-[#292929] bg-[#111111] transition-all duration-300 hover:border-[#504532] open:border-[#806b3d] open:bg-[#151515]"
                        >
                            {/* Question */}
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-5 marker:hidden">
                                <span className="font-[var(--font-hanken)] text-[14px] font-bold leading-5 text-[#e5e2e1] sm:text-[15px]">
                                    {faq.question}
                                </span>

                                {/* Icon */}
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] border border-[#292929] bg-[#0e0e0e] text-[#fbbc0e]">
                                    <ChevronDown
                                        size={13}
                                        strokeWidth={2}
                                        className="block group-open:hidden"
                                    />

                                    <ChevronUp
                                        size={13}
                                        strokeWidth={2}
                                        className="hidden group-open:block"
                                    />
                                </span>
                            </summary>

                            {/* Answer */}
                            <div className="px-5 pb-5">
                                <p className="border-t border-[#292929] pt-4 font-[var(--font-inter)] text-[12px] leading-5 text-[#d4c5ac] sm:text-[13px] sm:leading-6">
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
