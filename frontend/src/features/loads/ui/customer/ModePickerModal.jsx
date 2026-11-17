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
import { FileText, Package } from 'lucide-react';
import { IconChip, Modal, ToneBadge } from '@/shared/ui/kit';
import { cn } from '@/shared/lib/utils';

const NEW_ADHOC_PATH = '/customer/loads/new';

function ModeCard({ icon: Icon, title, description, badge, disabled, href }) {
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

    if (disabled) {
        return (
            <div className={cn(base, 'cursor-not-allowed opacity-60')} aria-disabled="true">
                {inner}
            </div>
        );
    }
    return (
        <Link href={href} className={cn(base, 'hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]')}>
            {inner}
        </Link>
    );
}

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function ModePickerModal({ open, onClose }) {
    return (
        <Modal
            open={open}
            onOpenChange={(next) => !next && onClose()}
            size="md"
            title="New load"
            description="Choose how this load will be placed and priced."
        >
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
            <p className="mt-4 text-xs text-[var(--ds-on-surface-muted)]">
                Not sure? Ad Hoc is the right choice for a one-off movement. Use Contract when you move the same lane regularly.
            </p>
        </Modal>
    );
}
