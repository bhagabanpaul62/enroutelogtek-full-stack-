'use client';

import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { acceptAwardApi, declineAwardApi } from '../../api/loads.api';
import { useBidActions } from '../../hooks/useBidActions';
import { formatCountdown, formatDateTime } from '../../lib/format';

const QUIET = 'text-[12px] text-muted-foreground';

/**
 * The customer's award for this load. Pending: accept or decline before the deadline
 * (managers only). Otherwise a quiet line saying how it ended.
 * @param {{ award: object, canManage: boolean, now: number, onChanged: () => void }} props
 */
export default function AwardResponse({ award, canManage, now, onChanged }) {
    const { run, busy } = useBidActions(onChanged);
    const [confirmDialog, confirm] = useConfirm();

    if (award.status === 'accepted') {
        return <p className={QUIET}>Accepted on {formatDateTime(award.respondedAt)}</p>;
    }
    if (award.status === 'declined') {
        return <p className={QUIET}>You declined this award on {formatDateTime(award.respondedAt)}.</p>;
    }
    if (award.status === 'expired') {
        return (
            <p className={QUIET}>
                This award expired on {formatDateTime(award.acceptBy)} without an answer.
            </p>
        );
    }
    if (award.status !== 'pending') return null;

    const countdown = formatCountdown(award.acceptBy, now);

    const accept = async () => {
        const ok = await confirm({
            title: 'Accept this load?',
            description:
                'You commit to moving it at your bid amount. Next you assign a truck and a driver.',
            confirmLabel: 'Accept',
        });
        if (ok) run(() => acceptAwardApi(award.id));
    };

    const decline = async () => {
        const ok = await confirm({
            title: 'Decline this award?',
            description:
                'The load goes back to the customer, who can pick another transporter. This cannot be undone.',
            confirmLabel: 'Decline',
            destructive: true,
        });
        if (ok) run(() => declineAwardApi(award.id));
    };

    return (
        <section className="rounded-[4px] border border-primary/50 bg-primary/5 p-4" aria-label="Award">
            <h2 className="text-[14px] font-semibold text-foreground">The customer picked your bid.</h2>
            <p className="mt-1 text-[13px] text-[#c6c6c7]">
                Accept before {formatDateTime(award.acceptBy)}{' '}
                <span className="font-mono text-[#f0955a]">({countdown ? `${countdown} left` : 'time is up'})</span>
            </p>

            {canManage ? (
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="lg" onClick={accept} disabled={busy}>
                        {busy ? <Loader2 className="animate-spin" /> : <Check />} Accept
                    </Button>
                    <Button size="lg" variant="outline" onClick={decline} disabled={busy}>
                        <X /> Decline
                    </Button>
                </div>
            ) : (
                <p className="mt-3 text-[12px] text-muted-foreground">
                    Only admins, co-admins and bid managers can answer an award.
                </p>
            )}

            {confirmDialog}
        </section>
    );
}
