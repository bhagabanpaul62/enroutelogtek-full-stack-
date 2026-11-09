'use client';

import { formatRupees } from '../../lib/format';
import ReasonDialog from './ReasonDialog';

/**
 * "Pick this bid as the winner": shows the bid and takes an optional reason for the record.
 * The transporter then has 24 hours to accept.
 * @param {{ open: boolean, bid: object|null, busy?: boolean, onCancel: () => void, onSubmit: (reason: string) => void }} props
 */
export default function AwardDialog({ open, bid, busy, onCancel, onSubmit }) {
    const name = bid?.transporter?.name ?? 'this transporter';
    return (
        <ReasonDialog
            open={open}
            title={`Pick ${name} as the winner?`}
            description={
                <>
                    Their bid is <span className="font-mono text-foreground">{formatRupees(bid?.currentAmount)}</span>
                    {bid?.currentRank ? ` (ranked L${bid.currentRank})` : ''}. They get 24 hours to accept; if they
                    decline or stay silent, you can pick another bid.
                </>
            }
            confirmLabel="Pick as winner"
            busy={busy}
            placeholder="For example: best price with a truck available on the day."
            onCancel={onCancel}
            onSubmit={onSubmit}
        />
    );
}
