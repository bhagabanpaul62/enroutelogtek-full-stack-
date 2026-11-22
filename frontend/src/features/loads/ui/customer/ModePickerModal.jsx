'use client';

/**
 * AJ-01 / AJ-02 / AJ-03 — Mode picker, then the FTL / PTL gate
 *
 * Shown before the wizard opens. First the customer picks Ad Hoc (one load, one date, short bidding
 * window) or Contract (a lane over a period). Then a second choice: a full truck (FTL) or a part
 * load (PTL). Ad Hoc opens the load wizard, Contract opens the contract wizard; both read `?type=`.
 * A PTL contract prices each lane per kg; each indent is one shipment of packages (PRD Q2).
 *
 * BR-01: load.kind is fixed at creation; this gate is the only place it can be chosen.
 */
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, FileText, Package, Truck, Boxes } from 'lucide-react';
import { IconChip, Modal } from '@/shared/ui/kit';
import { cn } from '@/shared/lib/utils';

const NEW_ADHOC_PATH = '/customer/loads/new';
const NEW_CONTRACT_PATH = '/customer/rfqs/new';

function ModeCard({ icon: Icon, title, description, href, onClick }) {
    const inner = (
        <>
            <div className="mb-3 flex items-start justify-between gap-2">
                <IconChip className="size-10">
                    <Icon size={18} />
                </IconChip>
            </div>
            <h3 className="text-[15px] font-medium leading-snug text-[var(--ds-on-surface)]">{title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--ds-on-surface-muted)]">{description}</p>
        </>
    );
    const base = 'flex flex-col rounded-2xl bg-white/[0.04] p-5 text-left outline-none transition-colors duration-150';
    const live = 'hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]';

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
    const [mode, setMode] = useState('adhoc'); // 'adhoc' | 'contract'
    const contract = mode === 'contract';
    const base = contract ? NEW_CONTRACT_PATH : NEW_ADHOC_PATH;
    const pick = (next) => {
        setMode(next);
        setStage('type');
    };
    const close = () => {
        setStage('mode');
        onClose();
    };

    return (
        <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="md"
            title={stage === 'mode' ? 'New load' : contract ? 'What kind of contract?' : 'How much are you moving?'}
            description={stage === 'mode' ? 'Choose how this load will be placed and priced.' : contract ? 'This decides how transporters price the contract. It cannot be changed later.' : 'This decides the form and how transporters price their bids.'}
        >
            {stage === 'mode' ? (
                <>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ModeCard
                            icon={Package}
                            title="Ad Hoc"
                            description="One shipment, one pickup date. Invite your transporters to bid in a short window and pick the winner."
                            onClick={() => pick('adhoc')}
                        />
                        <ModeCard
                            icon={FileText}
                            title="Contract"
                            description="The same lanes every month for a period. Transporters quote a rate per lane, you award it, then book trucks against the contract as you need them."
                            onClick={() => pick('contract')}
                        />
                    </div>
                    <p className="mt-4 text-xs text-[var(--ds-on-surface-muted)]">
                        Not sure? Ad Hoc is the right choice for a one-off movement. Use Contract when you move the same lane regularly and want one rate for the period.
                    </p>
                </>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ModeCard
                            icon={Truck}
                            title={contract ? 'Full truck contract (FTL)' : 'Full truck load (FTL)'}
                            description={contract ? 'A rate for each lane, per truck trip or per ton, for the whole period.' : 'The whole truck is yours. Transporters bid per truck, per ton or per km.'}
                            href={`${base}?type=FTL`}
                        />
                        <ModeCard
                            icon={Boxes}
                            title={contract ? 'Part load contract (PTL)' : 'Part load (PTL)'}
                            description={contract ? 'A rate per kg for each lane. Each indent is one shipment of packages, charged on its chargeable weight.' : 'Packages that share a truck. You enter package sizes and weight; bids are per kg on the chargeable weight.'}
                            href={`${base}?type=PTL`}
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
