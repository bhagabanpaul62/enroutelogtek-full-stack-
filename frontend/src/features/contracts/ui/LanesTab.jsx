'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Chip } from '@/shared/ui/data-grid';
import { EmptyState, ErrorState, Panel, SidePanel, SkeletonRows, TickBar, ToneBadge } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import { getConsumptionApi } from '../api/contract.api';
import { currentMonth, errorText, formatDate, formatRate, formatTrucks, laneRoute, monthOf, todayIST } from '../lib/format';
import { TextInput } from './fields';

/** The first term whose effective date is still ahead: "From Dec 15: ₹60,000 / truck". */
const upcomingTerm = (lane) =>
    [...(lane.terms ?? [])].filter((t) => t.effectiveFrom > todayIST()).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0];

function VersionHistory({ lane, onClose }) {
    const terms = [...(lane?.terms ?? [])].sort((a, b) => b.version - a.version);
    return (
        <SidePanel open={Boolean(lane)} onOpenChange={(next) => !next && onClose()} size="md" title="Rate history" description={lane ? `Lane ${lane.laneNo}: ${laneRoute(lane)}` : ''}>
            <ol className="flex flex-col gap-2">
                {terms.map((t) => (
                    <li key={t.version} className="rounded-2xl bg-white/[0.04] px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-medium text-[var(--ds-on-surface)]">Version {t.version}</span>
                            <span className="text-xs text-[var(--ds-on-surface-muted)]">From {formatDate(t.effectiveFrom)}</span>
                        </div>
                        <p className="mt-1 text-sm tabular-nums text-[var(--ds-on-surface-variant)]">
                            {formatRate(t.ratePaise, lane.rateBasis)} · {formatTrucks(t.monthlyVolumeTrucks)} a month
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--ds-on-surface-muted)]">{t.amendmentId ? 'Changed by an accepted amendment' : 'Awarded through the RFQ'}</p>
                    </li>
                ))}
            </ol>
        </SidePanel>
    );
}

/** Lanes with rate, monthly volume and how much of the month is used (consumed = acknowledged + fulfilled). */
export default function LanesTab({ contract }) {
    const [month, setMonth] = useState(currentMonth());
    const [state, setState] = useState({ key: null, data: null, error: '' });
    const [reloadCount, setReloadCount] = useState(0);
    const [history, setHistory] = useState(null);
    const key = `${contract.id}|${month}|${contract.version}|${reloadCount}`;

    useEffect(() => {
        let ignore = false;
        getConsumptionApi(contract.id, month)
            .then(({ data }) => !ignore && setState({ key, data: data.data, error: '' }))
            .catch((error) => !ignore && setState({ key, data: null, error: errorText(error, 'Could not load this month.') }));
        return () => {
            ignore = true;
        };
    }, [contract.id, month, key]);

    const loading = state.key !== key;
    const byLane = new Map((state.data?.lanes ?? []).map((l) => [l.contractLaneId, l]));

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--ds-on-surface-muted)]">Trucks used per lane in the month picked. Over-volume is allowed and only flagged.</p>
                <TextInput type="month" aria-label="Month" value={month} min={monthOf(contract.validFrom)} max={monthOf(contract.validTo)} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-44" />
            </div>

            {contract.lanes.length === 0 ? (
                <Panel><EmptyState title="No lanes on this contract" description="Lanes come from the awarded RFQ." /></Panel>
            ) : state.error ? (
                <Panel><ErrorState title="Usage could not be loaded" description={state.error} onRetry={() => setReloadCount((c) => c + 1)} /></Panel>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {contract.lanes.map((lane) => {
                        const used = byLane.get(lane.id);
                        const volume = lane.currentTerm?.monthlyVolumeTrucks ?? used?.monthlyVolumeTrucks ?? 0;
                        const consumed = used?.consumed ?? 0;
                        const next = upcomingTerm(lane);
                        return (
                            <Panel
                                key={lane.id}
                                title={`Lane ${lane.laneNo}: ${laneRoute(lane)}`}
                                action={
                                    <Button size="sm" variant="ghost" aria-label={`Rate history for lane ${lane.laneNo}`} onClick={() => setHistory(lane)}>
                                        <History /> v{lane.currentTerm?.version ?? 1}
                                    </Button>
                                }
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <span className="text-2xl font-light tabular-nums text-[var(--ds-on-surface)]">{formatRate(lane.currentTerm?.ratePaise, lane.rateBasis)}</span>
                                    {lane.vehicleType?.name ? <Chip>{lane.vehicleType.name}</Chip> : null}
                                </div>
                                {next ? <p className="mt-1 text-xs text-amber-300">From {formatDate(next.effectiveFrom)}: {formatRate(next.ratePaise, lane.rateBasis)}, {formatTrucks(next.monthlyVolumeTrucks)} a month</p> : null}
                                <div className="mt-5">
                                    {loading ? (
                                        <SkeletonRows rows={1} />
                                    ) : (
                                        <>
                                            <TickBar value={volume ? (consumed / volume) * 100 : 0} tone={used?.over ? 'danger' : 'info'} />
                                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ds-on-surface-muted)]">
                                                <span className="tabular-nums">
                                                    {consumed} of {volume} trucks used
                                                    {used?.requested ? ` · ${used.requested} awaiting acknowledge` : ''}
                                                </span>
                                                {used?.over ? <ToneBadge label={`${formatTrucks(Math.abs(used.remaining))} over`} tone="danger" /> : <span className="tabular-nums">{Math.max(0, volume - consumed)} left</span>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Panel>
                        );
                    })}
                </div>
            )}
            <VersionHistory lane={history} onClose={() => setHistory(null)} />
        </div>
    );
}
