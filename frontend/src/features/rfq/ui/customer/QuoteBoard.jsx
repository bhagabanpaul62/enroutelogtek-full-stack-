'use client';

import { useEffect, useMemo, useState } from 'react';
import { History, Lock, Trophy, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { EmptyState, ErrorState, Inset, Panel, SidePanel, SkeletonRows, StatusChip, ToneBadge, formatINR } from '@/shared/ui/kit';
import { formatDateTime } from '@/shared/lib/format';
import { formatCountdown } from '@/features/loads/lib/format';
import { awardLanesApi, getRfqBoardApi } from '../../api/rfq.api';
import { apiMessage, basisLabel, basisUnit, boardRoute } from '../../lib/rfq';
import { AwardLanesDialog } from './RfqDialogs';

const LIVE = ['pending', 'accepted'];

/** "4% above target" / "2% below target" as a tone chip: above is a warning, below is good. */
function TargetChip({ pct }) {
    if (pct === null || pct === undefined || Number.isNaN(Number(pct))) return null;
    const n = Math.round(Number(pct) * 10) / 10;
    if (n === 0) return <ToneBadge label="On target" tone="success" />;
    return <ToneBadge label={`${Math.abs(n)}% ${n > 0 ? 'above' : 'below'} target`} tone={n > 0 ? 'warning' : 'success'} />;
}

function QuoteRow({ lane, quote, picked, selectable, onPick, onHistory }) {
    const radioId = `pick-${lane.laneId}-${quote.quoteId}`;
    const history = quote.revisions ?? [];
    return (
        <li>
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-4 py-3 transition-colors ${picked ? 'bg-primary/10 ring-1 ring-primary/50' : quote.rank === 1 ? 'bg-white/[0.06]' : 'bg-white/[0.035]'}`}>
                <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums ${quote.rank === 1 ? 'bg-primary text-primary-foreground' : 'bg-white/[0.08] text-[var(--ds-on-surface-variant)]'}`}
                    aria-label={`Rank ${quote.rank}`}
                    title={quote.rank === 1 ? 'Lowest quote' : `Ranked ${quote.rank}`}
                >
                    L{quote.rank}
                </span>
                <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-medium text-[var(--ds-on-surface)]">{quote.transporter.name}</p>
                    <p className="text-xs text-[var(--ds-on-surface-muted)]">Last quoted {formatDateTime(quote.lastSubmittedAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                    <TargetChip pct={quote.vsTargetPct} />
                    {history.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onHistory(quote)}
                            aria-label={`Quote history of ${quote.transporter.name}, ${history.length} ${history.length === 1 ? 'entry' : 'entries'}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-[var(--ds-on-surface-variant)] transition-colors hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                        >
                            <History className="size-3.5" aria-hidden /> {history.length}
                        </button>
                    )}
                    <p className="min-w-24 text-right text-lg font-medium tabular-nums tracking-tight text-[var(--ds-on-surface)]">{formatINR(quote.currentRatePaise)}</p>
                </div>
                <label htmlFor={radioId} className={`flex items-center gap-2 text-[13px] ${selectable ? 'cursor-pointer text-[var(--ds-on-surface-variant)]' : 'cursor-not-allowed text-[var(--ds-on-surface-muted)] opacity-60'}`}>
                    <input
                        id={radioId}
                        type="radio"
                        name={`lane-${lane.laneId}`}
                        checked={picked}
                        disabled={!selectable}
                        onChange={() => onPick(lane.laneId, quote.quoteId)}
                        className="size-4 accent-primary"
                    />
                    Award
                </label>
            </div>
        </li>
    );
}

function AwardLine({ award }) {
    return (
        <p className="flex flex-wrap items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-[13px] text-[var(--ds-on-surface-variant)]">
            <Trophy className="size-4 text-primary" aria-hidden />
            <span>
                Awarded to <strong className="font-medium text-[var(--ds-on-surface)]">{award.transporter?.name}</strong> at {formatINR(award.ratePaise)}
            </span>
            <StatusChip value={award.status} />
        </p>
    );
}

function LaneCard({ lane, picked, canAward, onPick, onClear, onHistory, unit = 'trucks' }) {
    const live = lane.award && LIVE.includes(lane.award.status);
    const selectable = canAward && !live && lane.quotes.length > 0;
    const past = lane.history ?? [];
    return (
        <Panel
            title={`Lane ${lane.laneNo}: ${boardRoute(lane)}`}
            action={
                picked ? (
                    <button
                        type="button"
                        onClick={() => onClear(lane.laneId)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--ds-on-surface-variant)] hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                    >
                        <X className="size-3.5" aria-hidden /> Clear pick
                    </button>
                ) : null
            }
        >
            <p className="mb-4 text-xs text-[var(--ds-on-surface-muted)]">
                {lane.vehicleType?.name} · {lane.monthlyVolumeTrucks} {unit} a month · rates {basisUnit(lane.rateBasis)}
                {lane.targetRatePaise ? ` · your target ${formatINR(lane.targetRatePaise)}` : ''}
            </p>
            <div className="grid gap-3">
                {live && <AwardLine award={lane.award} />}
                {past.map((a) => (
                    <p key={a.id} className="text-xs text-[var(--ds-on-surface-muted)]">
                        {a.transporter?.name} {a.status === 'declined' ? 'declined' : 'did not answer in time'} at {formatINR(a.ratePaise)}.{a.declineReason ? ` "${a.declineReason}"` : ''}
                    </p>
                ))}
                {lane.quotes.length === 0 ? (
                    <Inset>
                        <p className="text-sm text-[var(--ds-on-surface-muted)]">No transporter quoted this lane.</p>
                    </Inset>
                ) : (
                    <ul className="grid gap-2" aria-label={`Quotes for lane ${lane.laneNo}, lowest first`}>
                        {lane.quotes.map((q) => (
                            <QuoteRow key={q.quoteId} lane={lane} quote={q} picked={picked === q.quoteId} selectable={selectable} onPick={onPick} onHistory={(quote) => onHistory(lane, quote)} />
                        ))}
                    </ul>
                )}
            </div>
        </Panel>
    );
}

/** Quotes tab. Before the window closes: counts only. After: the ranked board and the award flow. */
export default function QuoteBoard({ rfq, now, canAward, onAwarded, focusLaneId }) {
    const closed = ['closed', 'awarded', 'cancelled'].includes(rfq.status);
    const awardsKey = (rfq.laneAwards ?? []).map((a) => `${a.id}:${a.status}`).join(',');
    const [state, setState] = useState({ key: null, board: null, error: '' });
    const [attempt, setAttempt] = useState(0);
    const [picks, setPicks] = useState({}); // laneId -> quoteId
    const [history, setHistory] = useState(null); // { lane, quote }
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const requestKey = `${rfq.id}|${awardsKey}|${attempt}`;

    useEffect(() => {
        if (!closed) return undefined;
        let ignore = false;
        getRfqBoardApi(rfq.id)
            .then(({ data }) => {
                if (!ignore) setState({ key: requestKey, board: data.data, error: '' });
            })
            .catch((error) => {
                if (!ignore) setState({ key: requestKey, board: null, error: apiMessage(error, 'Could not load the quotes.') });
            });
        return () => {
            ignore = true;
        };
    }, [rfq.id, closed, requestKey]);

    // A lane that gained a live award can no longer hold a pick.
    const lanes = state.board?.lanes;
    const pickList = useMemo(() => {
        if (!lanes) return [];
        return lanes
            .filter((l) => picks[l.laneId] && !(l.award && LIVE.includes(l.award.status)))
            .map((lane) => ({ lane, quote: lane.quotes.find((q) => q.quoteId === picks[lane.laneId]) }))
            .filter((p) => p.quote);
    }, [lanes, picks]);

    useEffect(() => {
        if (!focusLaneId || !lanes) return;
        document.getElementById(`board-lane-${focusLaneId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [focusLaneId, lanes]);

    if (rfq.status === 'draft') {
        return (
            <Panel>
                <EmptyState title="No quotes yet" description="Publish the RFQ to open the quote window." />
            </Panel>
        );
    }

    if (rfq.status === 'open') {
        const left = formatCountdown(rfq.closesAt, now);
        return (
            <Panel title="Quotes are sealed">
                <p className="flex items-center gap-2 text-sm text-[var(--ds-on-surface-variant)]">
                    <Lock className="size-4 shrink-0 text-primary" aria-hidden />
                    Rates are visible after the window closes{left ? `, in ${left}` : ''}. Until then you can see how many quotes each lane has.
                </p>
                <ul className="mt-4 grid gap-2">
                    {(rfq.lanes ?? []).map((lane) => (
                        <li key={lane.id}>
                            <Inset className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                                <span className="min-w-0 truncate text-[var(--ds-on-surface)]">
                                    Lane {lane.laneNo}: {lane.originCity} → {lane.destCity}
                                </span>
                                <span className="shrink-0 tabular-nums text-[var(--ds-on-surface-muted)]">
                                    {lane.quoteCount ?? 0} {lane.quoteCount === 1 ? 'quote' : 'quotes'}
                                </span>
                            </Inset>
                        </li>
                    ))}
                </ul>
            </Panel>
        );
    }

    if (state.key !== requestKey && !state.board) {
        return (
            <Panel>
                <SkeletonRows rows={5} />
            </Panel>
        );
    }
    if (state.error && !state.board) {
        return (
            <Panel>
                <ErrorState title="Couldn't load the quotes" description={state.error} onRetry={() => setAttempt((n) => n + 1)} />
            </Panel>
        );
    }

    const transporterCount = new Set(pickList.map((p) => p.quote.transporter.id)).size;
    const award = async (reason) => {
        setBusy(true);
        try {
            const { data } = await awardLanesApi(
                rfq.id,
                pickList.map(({ lane, quote }) => ({ laneId: lane.laneId, quoteId: quote.quoteId, reason: reason || undefined })),
            );
            toast.success('Lanes awarded. Transporters have 24 hours to answer.');
            setConfirming(false);
            setPicks({});
            onAwarded(data.data);
        } catch (error) {
            toast.error(apiMessage(error));
            if ([404, 409, 422].includes(error.response?.status)) {
                setConfirming(false);
                setAttempt((n) => n + 1);
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {state.error && <p role="alert" className="rounded-2xl bg-amber-400/10 px-4 py-3 text-[13px] text-amber-300">{state.error}</p>}
            {state.board.lanes.map((lane) => (
                <div key={lane.laneId} id={`board-lane-${lane.laneId}`}>
                    <LaneCard
                        lane={lane}
                        unit={rfq.loadType === 'PTL' ? 'shipments' : 'trucks'}
                        picked={picks[lane.laneId]}
                        canAward={canAward}
                        onPick={(laneId, quoteId) => setPicks((p) => ({ ...p, [laneId]: quoteId }))}
                        onClear={(laneId) =>
                            setPicks((p) => {
                                const next = { ...p };
                                delete next[laneId];
                                return next;
                            })
                        }
                        onHistory={(l, quote) => setHistory({ lane: l, quote })}
                    />
                </div>
            ))}

            {pickList.length > 0 && (
                <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-3xl bg-[var(--ds-surface-container-low)] px-5 py-3 shadow-lg shadow-black/30">
                    <p className="min-w-0 flex-1 text-sm text-[var(--ds-on-surface)]">
                        {pickList.length} {pickList.length === 1 ? 'lane' : 'lanes'} picked for {transporterCount} {transporterCount === 1 ? 'transporter' : 'transporters'}
                    </p>
                    <Button variant="secondary" onClick={() => setPicks({})}>
                        Clear
                    </Button>
                    <Button onClick={() => setConfirming(true)}>
                        <Trophy /> Award {pickList.length} {pickList.length === 1 ? 'lane' : 'lanes'}
                    </Button>
                </div>
            )}

            {confirming && <AwardLanesDialog open picks={pickList} busy={busy} onCancel={() => setConfirming(false)} onSubmit={award} />}

            <SidePanel
                open={Boolean(history)}
                onOpenChange={(open) => !open && setHistory(null)}
                size="sm"
                icon={<History className="size-5" />}
                title="Quote history"
                description={history ? `${history.quote.transporter.name} · ${boardRoute(history.lane)}` : ''}
            >
                {history && (
                    <ol className="grid gap-2">
                        {[...(history.quote.revisions ?? [])]
                            .sort((a, b) => b.revisionNumber - a.revisionNumber)
                            .map((r, i) => (
                                <li key={r.revisionNumber}>
                                    <Inset className="px-4 py-3">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <p className="text-base font-medium tabular-nums text-[var(--ds-on-surface)]">{formatINR(r.ratePaise)}</p>
                                            <p className="text-xs text-[var(--ds-on-surface-muted)]">{i === 0 ? 'Current' : `Revision ${r.revisionNumber}`}</p>
                                        </div>
                                        <p className="mt-1 text-xs text-[var(--ds-on-surface-muted)]">{formatDateTime(r.createdAt)}</p>
                                        {r.note && <p className="mt-1 text-[13px] text-[var(--ds-on-surface-variant)]">{r.note}</p>}
                                    </Inset>
                                </li>
                            ))}
                        <li className="px-1 pt-1 text-xs text-[var(--ds-on-surface-muted)]">Rates are {basisLabel(history.lane.rateBasis).toLowerCase()}.</li>
                    </ol>
                )}
            </SidePanel>
        </div>
    );
}
