'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, Trophy } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/primitives/button';
import { getLoadBidsApi } from '../../api/loads.api';
import { MARGIN_TYPE_LABELS, MAX_ATTEMPTS } from '../../constants';
import { formatDateTime, formatRupees } from '../../lib/format';

const EMPTY_TEXT = {
    draft: 'Publish the load to open bidding.',
    live: 'No bids yet.',
    expired: 'Nobody bid; extend the window or edit and publish again.',
    cancelled: 'The load was cancelled before any bid came in.',
};

/** The attempts behind one bid, oldest first. */
function AttemptsTable({ attempts }) {
    if (attempts.length === 0) return <p className="text-[12px] text-muted-foreground">No attempts recorded.</p>;
    return (
        <table className="w-full text-[12px]">
            <thead>
                <tr className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-1 text-left font-normal">#</th>
                    <th className="py-1 text-right font-normal">Base</th>
                    <th className="py-1 text-right font-normal">Margin</th>
                    <th className="py-1 text-right font-normal">Final</th>
                    <th className="py-1 text-right font-normal">Rank then</th>
                    <th className="py-1 text-right font-normal">When</th>
                </tr>
            </thead>
            <tbody>
                {attempts.map((attempt) => (
                    <tr key={attempt.attemptNumber} className="border-t border-border text-foreground">
                        <td className="py-1.5 font-mono">{attempt.attemptNumber}</td>
                        <td className="py-1.5 text-right">{formatRupees(attempt.baseRate)}</td>
                        <td className="py-1.5 text-right text-[#c6c6c7]">
                            {attempt.marginType === 'percent'
                                ? `${attempt.marginValue}%`
                                : formatRupees(attempt.marginValue)}{' '}
                            <span className="text-muted-foreground">({MARGIN_TYPE_LABELS[attempt.marginType] ?? attempt.marginType})</span>
                        </td>
                        <td className="py-1.5 text-right font-medium">{formatRupees(attempt.finalAmount)}</td>
                        <td className="py-1.5 text-right font-mono">L{attempt.rankAtSubmit}</td>
                        <td className="py-1.5 text-right text-[#c6c6c7]">{formatDateTime(attempt.createdAt)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** The attempts for every bid, fetched the first time a row opens and again when a bid moves. */
function useBidAttempts(loadId, signature, enabled) {
    const [state, setState] = useState({ signature: null, byBid: {}, error: '' });

    useEffect(() => {
        if (!enabled || state.signature === signature) return undefined;
        let ignore = false;
        getLoadBidsApi(loadId)
            .then(({ data }) => {
                if (!ignore) {
                    setState({
                        signature,
                        byBid: Object.fromEntries(data.data.map((bid) => [bid.id, bid.attempts ?? []])),
                        error: '',
                    });
                }
            })
            .catch((error) => {
                if (!ignore) {
                    setState({
                        signature,
                        byBid: {},
                        error: error.response?.data?.message || 'Could not load the attempts.',
                    });
                }
            });
        return () => {
            ignore = true;
        };
    }, [loadId, signature, enabled, state.signature]);

    return { byBid: state.byBid, error: state.error, isLoading: enabled && state.signature !== signature };
}

/**
 * Every bid on the load, ranked, each one opening to its attempts. When bidding has closed
 * a manager picks the winner from here.
 * @param {{ load: object, canManage: boolean, onPick: (bid: object) => void, busy?: boolean }} props
 */
export default function BidBoard({ load, canManage, onPick, busy = false }) {
    const bids = [...(load.bids ?? [])].sort((a, b) => a.currentRank - b.currentRank);
    const [openIds, setOpenIds] = useState(() => new Set());
    const signature = bids.map((bid) => `${bid.id}:${bid.attemptsUsed}`).join(',');
    const attempts = useBidAttempts(load.id, signature, openIds.size > 0);
    const canPick = canManage && load.status === 'closed';

    const toggle = (bidId) =>
        setOpenIds((prev) => {
            const next = new Set(prev);
            if (next.has(bidId)) next.delete(bidId);
            else next.add(bidId);
            return next;
        });

    if (bids.length === 0) {
        return (
            <p className="rounded-[4px] border border-dashed border-border px-4 py-6 text-center text-[13px] text-[#c6c6c7]">
                {EMPTY_TEXT[load.status] ?? 'No bids.'}
            </p>
        );
    }

    return (
        <ul className="divide-y divide-border overflow-hidden rounded-[4px] border border-border">
            {bids.map((bid) => {
                const open = openIds.has(bid.id);
                const isWinner = load.award?.bidId === bid.id && load.award?.status !== 'declined' && load.award?.status !== 'expired';
                return (
                    <li key={bid.id} className={cn(isWinner && 'bg-primary/5')}>
                        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                            <span
                                className={cn(
                                    'flex size-8 shrink-0 items-center justify-center rounded-[4px] border font-mono text-[12px]',
                                    bid.currentRank === 1
                                        ? 'border-primary/50 bg-primary/10 text-primary'
                                        : 'border-border text-[#c6c6c7]',
                                )}
                            >
                                L{bid.currentRank}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-foreground">
                                    <span className="truncate">{bid.transporter?.name}</span>
                                    {isWinner && (
                                        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                                            <Trophy size={11} /> Winner
                                        </span>
                                    )}
                                </p>
                                <p className="font-mono text-[11px] text-muted-foreground">{bid.transporter?.enrouteCompanyId}</p>
                            </div>
                            <div className="text-[12px] text-[#c6c6c7] sm:text-right">
                                <p className="text-[16px] font-semibold text-foreground">{formatRupees(bid.currentAmount)}</p>
                                <p>
                                    {bid.attemptsUsed} of {load.maxAttempts ?? MAX_ATTEMPTS} attempts · last{' '}
                                    {formatDateTime(bid.lastAttemptAt)}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {canPick && (
                                    <Button disabled={busy} onClick={() => onPick(bid)}>
                                        <Trophy /> Pick as winner
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-expanded={open}
                                    aria-label={open ? 'Hide attempts' : 'Show attempts'}
                                    onClick={() => toggle(bid.id)}
                                >
                                    <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
                                </Button>
                            </div>
                        </div>
                        {open && (
                            <div className="border-t border-border bg-background px-4 py-3">
                                {attempts.isLoading ? (
                                    <p className="flex items-center gap-2 text-[12px] text-muted-foreground" aria-busy="true">
                                        <Loader2 size={14} className="animate-spin" /> Loading attempts…
                                    </p>
                                ) : attempts.error ? (
                                    <p className="text-[12px] text-destructive">{attempts.error}</p>
                                ) : (
                                    <AttemptsTable attempts={attempts.byBid[bid.id] ?? []} />
                                )}
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
