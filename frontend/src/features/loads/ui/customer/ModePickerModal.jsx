'use client';

/**
 * AJ-01 / AJ-02 / AJ-03 — Mode picker, then the FTL / PTL gate
 *
 * Shown before the wizard opens. First the customer picks Ad Hoc (one load, one date, short bidding
 * window) or Contract (a lane over a period — not built yet, so it shows "coming soon" until Wave 3).
 * After Ad Hoc, a second choice: a full truck (FTL) or a part load (PTL). The wizard reads it from
 * `?type=` and starts with that load type.
 *
 * BR-01: load.kind is fixed at creation; this gate is the only place it can be chosen.
 */
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, FileText, Package, Truck, Boxes } from 'lucide-react';
import { IconChip, Modal, ToneBadge } from '@/shared/ui/kit';
import { cn } from '@/shared/lib/utils';

const NEW_ADHOC_PATH = '/customer/loads/new';

function ModeCard({ icon: Icon, title, description, badge, disabled, href, onClick }) {
    const inner = (
        <>
            <div className="mb-3 flex items-start justify-between gap-2">
                <IconChip className="size-10">
                    <Icon size={18} />
                </IconChip>
                {badge ? <ToneBadge label={badge} /> : null}
            </div>
            <h3 className={cn('text-[15px] font-medium leading-snug', disabled ? 'text-[var(--ds-on-surface-muted)]' : 'text-[var(--ds-on-surface)]')}>{title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--ds-on-surface-muted)]">{description}</p>
        </>
    );
    const base = 'flex flex-col rounded-2xl bg-white/[0.04] p-5 text-left outline-none transition-colors duration-150';
    const live = 'hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]';

    if (disabled) {
        return (
            <div className={cn(base, 'cursor-not-allowed opacity-60')} aria-disabled="true">
                {inner}
            </div>
        );
    }
    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={cn(base, live)}>
                {inner}
            </button>
        );
    }
    return (
        <Link href={href} className={cn(base, live)}>
            {inner}
        </Link>
    );
}

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function ModePickerModal({ open, onClose }) {
    const [stage, setStage] = useState('mode'); // 'mode' | 'type'
    const close = () => {
        setStage('mode');
        onClose();
    };

    return (
        <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="md"
            title={stage === 'mode' ? 'New load' : 'How much are you moving?'}
            description={stage === 'mode' ? 'Choose how this load will be placed and priced.' : 'This decides the form and how transporters price their bids.'}
        >
            {stage === 'mode' ? (
                <>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ModeCard
                            icon={Package}
                            title="Ad Hoc"
                            description="One shipment, one pickup date. Invite your transporters to bid in a short window and pick the winner."
                            onClick={() => setStage('type')}
                        />
                        <ModeCard
                            icon={FileText}
                            title="Contract"
                            description="A lane or monthly volume over a period. Set rates, award a carrier, and place indents against the contract. Coming soon: for now, post it as an Ad Hoc load."
                            badge="Coming soon"
                            disabled
                        />
                    </div>
                    <p className="mt-4 text-xs text-[var(--ds-on-surface-muted)]">
                        Not sure? Ad Hoc is the right choice for a one-off movement. Use Contract when you move the same lane regularly.
                    </p>
                </>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ModeCard
                            icon={Truck}
                            title="Full truck load (FTL)"
                            description="The whole truck is yours. Transporters bid per truck, per ton or per km."
                            href={`${NEW_ADHOC_PATH}?type=FTL`}
                        />
                        <ModeCard
                            icon={Boxes}
                            title="Part load (PTL)"
                            description="Packages that share a truck. You enter package sizes and weight; bids are per kg on the chargeable weight."
                            href={`${NEW_ADHOC_PATH}?type=PTL`}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setStage('mode')}
                        className="mt-4 inline-flex items-center gap-1 rounded-md text-xs text-[var(--ds-on-surface-muted)] hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                    >
                        <ArrowLeft size={12} aria-hidden /> Back
                    </button>
                </>
            )}
        </Modal>
    );
}
