'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Trophy } from 'lucide-react';
import { EmptyState, ErrorState, SkeletonRows, ToneBadge, riseStyle } from '@/shared/ui/kit';
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
    if (attempts.length === 0) return <p className="text-xs text-[var(--ds-on-surface-muted)]">No attempts recorded.</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[13px]">
                <thead>
                    <tr className="text-xs text-[var(--ds-on-surface-muted)]">
                        <th className="py-1.5 text-left font-normal">Attempt</th>
                        <th className="py-1.5 text-right font-normal">Base</th>
                        <th className="py-1.5 text-right font-normal">Margin</th>
                        <th className="py-1.5 text-right font-normal">Final</th>
                        <th className="py-1.5 text-right font-normal">Rank then</th>
                        <th className="py-1.5 text-right font-normal">When</th>
                    </tr>
                </thead>
                <tbody>
                    {attempts.map((attempt) => (
                        <tr key={attempt.attemptNumber} className="text-[var(--ds-on-surface)]">
                            <td className="py-1.5 tabular-nums">{attempt.attemptNumber}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatRupees(attempt.baseRate)}</td>
                            <td className="py-1.5 text-right tabular-nums text-[var(--ds-on-surface-variant)]">
                                {attempt.marginType === 'percent' ? `${attempt.marginValue}%` : formatRupees(attempt.marginValue)}{' '}
                                <span className="text-[var(--ds-on-surface-muted)]">({MARGIN_TYPE_LABELS[attempt.marginType] ?? attempt.marginType})</span>
                            </td>
                            <td className="py-1.5 text-right font-medium tabular-nums">{formatRupees(attempt.finalAmount)}</td>
                            <td className="py-1.5 text-right tabular-nums">L{attempt.rankAtSubmit}</td>
                            <td className="py-1.5 text-right tabular-nums text-[var(--ds-on-surface-variant)]">{formatDateTime(attempt.createdAt)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
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

    const retry = () => setState((prev) => ({ ...prev, signature: null }));
    return { byBid: state.byBid, error: state.error, isLoading: enabled && state.signature !== signature, retry };
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
        return <EmptyState title={EMPTY_TEXT[load.status] ?? 'No bids.'} />;
    }

    return (
        <ul className="flex flex-col gap-2">
            {bids.map((bid, index) => {
                const open = openIds.has(bid.id);
                const isWinner = load.award?.bidId === bid.id && load.award?.status !== 'declined' && load.award?.status !== 'expired';
                const lowest = bid.currentRank === 1;
                return (
                    <li key={bid.id} className={cn('ds-rise rounded-2xl', lowest ? 'bg-primary/[0.07]' : 'bg-white/[0.035]')} style={riseStyle(index)}>
                        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                            <span
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-medium tabular-nums',
                                    lowest ? 'bg-primary text-primary-foreground' : 'bg-white/[0.08] text-[var(--ds-on-surface-variant)]',
                                )}
                                title={lowest ? 'Lowest bid' : `Ranked L${bid.currentRank}`}
                            >
                                L{bid.currentRank}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--ds-on-surface)]">
                                    <span className="truncate">{bid.transporter?.name}</span>
                                    {isWinner && <ToneBadge label="Winner" tone="accent" />}
                                </p>
                                {bid.transporter?.enrouteCompanyId && (
                                    <p className="font-mono text-[11px] text-[var(--ds-on-surface-muted)]">{bid.transporter.enrouteCompanyId}</p>
                                )}
                                <p className="text-xs text-[var(--ds-on-surface-muted)]">
                                    {bid.attemptsUsed} of {load.maxAttempts ?? MAX_ATTEMPTS} attempts · last {formatDateTime(bid.lastAttemptAt)}
                                </p>
                            </div>
                            <p className={cn('text-[22px] font-medium leading-none tabular-nums tracking-tight sm:text-right', lowest ? 'text-primary' : 'text-[var(--ds-on-surface)]')}>
                                {formatRupees(bid.currentAmount)}
                            </p>
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
                                    title={open ? 'Hide attempts' : 'Show attempts'}
                                    onClick={() => toggle(bid.id)}
                                >
                                    <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
                                </Button>
                            </div>
                        </div>
                        {open && (
                            <div className="px-4 pb-4">
                                {attempts.isLoading ? (
                                    <SkeletonRows rows={2} />
                                ) : attempts.error ? (
                                    <ErrorState title="Couldn't load the attempts" description={attempts.error} onRetry={attempts.retry} />
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
