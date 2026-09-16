import { ShieldCheck, Truck, Award, Handshake, Globe2 } from 'lucide-react';

export default function Marquee() {
    const items = [
        {
            text: '100% Transparent Pricing — Zero Hidden Fees',
            icon: ShieldCheck,
        },
        {
            text: 'Safe Handling Guaranteed',
            icon: Truck,
        },
        {
            text: '15+ Years of Supply Chain Excellence',
            icon: Award,
        },
        {
            text: 'Over 1,000 Active Corporate Partners',
            icon: Handshake,
        },
        {
            text: 'Trusted by Fortune 500 Companies',
            icon: Globe2,
        },
    ];

    return (
        <div className="w-full overflow-hidden border-y border-[#504532]/40 bg-black/40">
            <div className="flex w-max animate-[marquee_25s_linear_infinite] items-center py-3">
                {[...items, ...items].map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <div key={`${item.text}-${index}`} className="flex shrink-0 items-center">
                            <span className="flex items-center gap-2 px-8 font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.18em] text-[#d4c5ac] sm:text-[11px]">
                                <Icon
                                    size={14}
                                    strokeWidth={1.8}
                                    className="shrink-0 text-[#fbbc0e]"
                                />

                                <span>{item.text}</span>
                            </span>

                            <span className="h-1 w-1 shrink-0 rounded-full bg-[#fbbc0e]" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
