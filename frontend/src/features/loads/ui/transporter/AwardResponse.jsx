'use client';

import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { BigStat, Inset, Panel, StatusChip, TickBar } from '@/shared/ui/kit';
import { acceptAwardApi, declineAwardApi } from '../../api/loads.api';
import { useBidActions } from '../../hooks/useBidActions';
import { formatCountdown, formatDateTime } from '../../lib/format';
import { rs } from './money';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The customer's award for this load. Pending: a review card with accept or decline before the
 * deadline (managers only). Otherwise a quiet panel saying how it ended.
 * @param {{ award: object, amount?: number, canManage: boolean, now: number, onChanged: () => void }} props
 */
export default function AwardResponse({ award, amount, canManage, now, onChanged }) {
    const { run, busy } = useBidActions(onChanged);
    const [confirmDialog, confirm] = useConfirm();

    const ended = {
        accepted: `Accepted on ${formatDateTime(award.respondedAt)}`,
        declined: `You declined this award on ${formatDateTime(award.respondedAt)}.`,
        expired: `This award expired on ${formatDateTime(award.acceptBy)} without an answer.`,
    }[award.status];
    if (ended) {
        return (
            <Panel title="Award" action={<StatusChip value={award.status} />}>
                <p className="text-sm text-[var(--ds-on-surface-variant)]">{ended}</p>
            </Panel>
        );
    }
    if (award.status !== 'pending') return null;

    const countdown = formatCountdown(award.acceptBy, now);
    // The window is the time between the award and its deadline (24 h by default).
    const window = award.createdAt ? new Date(award.acceptBy) - new Date(award.createdAt) : DAY_MS;
    const left = Math.max(0, new Date(award.acceptBy).getTime() - now);
    const pct = window > 0 ? (left / window) * 100 : 0;

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
        <Panel title="The customer picked your bid" action={<StatusChip value="pending" />}>
            <Inset className="grid gap-5 sm:grid-cols-2">
                {amount !== undefined && <BigStat label="Your awarded amount" value={rs(amount)} />}
                <BigStat
                    label={`Accept before ${formatDateTime(award.acceptBy)}`}
                    value={countdown ? `${countdown} left` : 'Time is up'}
                    tone={pct < 25 ? 'warning' : 'default'}
                />
            </Inset>
            <TickBar className="mt-4" value={pct} tone={pct < 25 ? 'warning' : 'info'} />

            {canManage ? (
                <div className="mt-5 flex flex-wrap gap-2">
                    <Button className="h-10 rounded-xl px-4 text-sm" onClick={accept} disabled={busy}>
                        {busy ? <Loader2 className="animate-spin" /> : <Check />} Accept
                    </Button>
                    <Button variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={decline} disabled={busy}>
                        <X /> Decline
                    </Button>
                </div>
            ) : (
                <p className="mt-4 text-xs text-[var(--ds-on-surface-muted)]">
                    Only admins, co-admins and bid managers can answer an award.
                </p>
            )}

            {confirmDialog}
        </Panel>
    );
}
