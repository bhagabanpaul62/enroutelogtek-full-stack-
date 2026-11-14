'use client';

/**
 * AJ-01 / AJ-02 — Mode picker
 *
 * Shown before the wizard opens. The customer picks Ad Hoc (one load, one date, short bidding
 * window) or Contract (a lane over a period — not built yet, so it shows "coming soon").
 *
 * BR-01: load.kind is fixed at creation; this gate is the only place it can be chosen.
 */
import Link from 'next/link';
import { FileText, Package, X } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { cn } from '@/shared/lib/utils';

const NEW_ADHOC_PATH = '/customer/loads/new';

function ModeCard({ icon: Icon, title, description, badge, disabled, href, onClick }) {
    const inner = (
        <>
            {/* top row: icon + badge */}
            <div className="mb-3 flex items-start justify-between gap-2">
                <span
                    className={cn(
                        'flex size-9 items-center justify-center rounded-[6px] border',
                        disabled
                            ? 'border-border bg-card text-muted-foreground'
                            : 'border-primary/30 bg-primary/10 text-primary',
                    )}
                >
                    <Icon size={18} />
                </span>
                {badge && (
                    <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {badge}
                    </span>
                )}
            </div>

            {/* text */}
            <h3
                className={cn(
                    'text-[15px] font-semibold leading-snug',
                    disabled ? 'text-muted-foreground' : 'text-foreground',
                )}
            >
                {title}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[#c6c6c7]">{description}</p>
        </>
    );

    const baseCard =
        'relative flex flex-col rounded-[8px] border p-5 text-left transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/30';

    if (disabled) {
        return (
            <div
                className={cn(baseCard, 'cursor-not-allowed border-border bg-card opacity-60')}
                aria-disabled="true"
            >
                {inner}
            </div>
        );
    }

    if (href) {
        return (
            <Link
                href={href}
                className={cn(
                    baseCard,
                    'border-border bg-card hover:border-primary/50 hover:bg-[#111111]',
                )}
            >
                {inner}
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                baseCard,
                'w-full border-border bg-card hover:border-primary/50 hover:bg-[#111111]',
            )}
        >
            {inner}
        </button>
    );
}

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function ModePickerModal({ open, onClose }) {
    if (!open) return null;

    return (
        /* backdrop */
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Choose load type"
        >
            {/* panel — stop click propagation so clicking inside doesn't close */}
            <div
                className="w-full max-w-lg rounded-t-[12px] border border-border bg-background p-6 sm:rounded-[12px]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-[18px] font-semibold text-foreground">New load</h2>
                        <p className="mt-0.5 text-[13px] text-[#c6c6c7]">
                            Choose how this load will be placed and priced.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="mt-0.5 flex size-7 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* cards */}
                <div className="grid gap-3 sm:grid-cols-2">
                    <ModeCard
                        icon={Package}
                        title="Ad Hoc"
                        description="One shipment, one pickup date. Invite your transporters to bid in a short window and pick the winner."
                        href={NEW_ADHOC_PATH}
                    />
                    <ModeCard
                        icon={FileText}
                        title="Contract"
                        description="A lane or monthly volume over a period. Set rates, award a carrier, and place indents against the contract."
                        badge="Coming soon"
                        disabled
                    />
                </div>

                {/* footer hint */}
                <p className="mt-4 text-[12px] text-muted-foreground">
                    Not sure?{' '}
                    <span className="text-[#c6c6c7]">
                        Ad Hoc is the right choice for a one-off movement. Use Contract when you move the
                        same lane regularly.
                    </span>
                </p>
            </div>
        </div>
    );
}
