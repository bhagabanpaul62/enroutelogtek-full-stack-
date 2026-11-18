'use client';

import { Trophy } from 'lucide-react';
import { formatBid, formatRupees } from '../../lib/format';
import ReasonDialog from './ReasonDialog';

/**
 * "Pick this bid as the winner": shows the bid and takes an optional reason for the record.
 * The transporter then has 24 hours to accept.
 * @param {{ open: boolean, bid: object|null, busy?: boolean, onCancel: () => void, onSubmit: (reason: string) => void }} props
 */
export default function AwardDialog({ open, bid, priceBasis, busy, onCancel, onSubmit }) {
    const name = bid?.transporter?.name ?? 'this transporter';
    return (
        <ReasonDialog
            open={open}
            icon={<Trophy className="size-5" />}
            title={`Pick ${name} as the winner?`}
            description="They get 24 hours to accept. If they decline or stay silent, you can pick another bid."
            summary={`${formatBid(bid?.currentAmount, priceBasis)}${priceBasis === 'per_kg' && bid?.totalAmount != null ? ` (${formatRupees(bid.totalAmount)} total)` : ''}${bid?.currentRank ? ` · ranked L${bid.currentRank}` : ''}`}
            confirmLabel="Pick as winner"
            busy={busy}
            placeholder="For example: best price with a truck available on the day."
            onCancel={onCancel}
            onSubmit={onSubmit}
        />
    );
}
