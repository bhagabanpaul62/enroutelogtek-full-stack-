'use client';

import { useMemo, useState } from 'react';
import { IndianRupee, Truck } from 'lucide-react';
import { DataGrid } from '@/shared/ui/data-grid';
import { EmptyState, ErrorState, HatchedBars, Panel, StatCard, TrendArea, formatINR } from '@/shared/ui/kit';
import { getEarningsApi } from '@/features/reports/api/reports.api';
import { dayLabel, rangeFor, useReportData } from '@/features/reports/lib/report';
import { ExportButtons, RangeControl, deltaFor } from '@/features/reports/ui/parts';

const compact = (p) => formatINR(p, { compact: true });

/**
 * Fleet-owner earnings: the agreed rate plus approved extras of completed trips. "Earned", never "paid":
 * there is no settlement record yet.
 * Expects GET /reports/earnings: { totals: { earnedPaise, previousEarnedPaise, trips }, trend: [{ date, value, previous }], perVehicle: [{ vehicleId, registration, earnedPaise, trips }], trips: [{ id, tripNo, completedAt, lane, vehicle, transporter, agreedPaise, extrasPaise, earnedPaise }] }.
 */
export default function EarningsPage() {
    const [days, setDays] = useState('30');
    const params = useMemo(() => ({ ...rangeFor(days), bucket: 'completed' }), [days]);
    const { data, error, isLoading, retry } = useReportData(getEarningsApi, params);

    const totals = data?.totals ?? {};
    const trips = (data?.rows ?? []).map((r) => ({ ...r, earnedPaise: r.amountPaise }));
    const vehicles = (data?.perVehicle ?? []).slice(0, 8).map((v) => ({ key: v.vehicleId ?? v.registration, label: v.registration, value: v.earnedPaise, display: compact(v.earnedPaise) }));
    const trend = (data?.trend ?? []).map((p) => ({ ...p, day: dayLabel(p.date) }));
    const hasData = trips.length > 0;
    const { delta, meta } = deltaFor(totals.earnedPaise, totals.previousEarnedPaise, 'up');

    const columns = useMemo(
        () => [
            { key: 'tripNo', label: 'Trip', type: 'text', width: 150 },
            { key: 'completedAt', label: 'Completed', type: 'date', width: 120 },
            { key: 'lane', label: 'Lane', type: 'text' },
            { key: 'vehicle', label: 'Vehicle', type: 'text', width: 140 },
            { key: 'transporter', label: 'Transporter', type: 'text' },
            { key: 'agreedPaise', label: 'Agreed rate', type: 'money', width: 130 },
            { key: 'extrasPaise', label: 'Approved extras', type: 'money', width: 140 },
            { key: 'earnedPaise', label: 'Earned', type: 'money', width: 120 },
        ],
        [],
    );

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Earnings</h1>
                    <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">Agreed rate plus approved extras on completed trips. This is what you earned, not what has been paid.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <RangeControl value={days} onChange={setDays} />
                    <ExportButtons companyType="fleet_owner" params={params} disabled={isLoading || !hasData} />
                </div>
            </header>

            {error ? (
                <Panel>
                    <ErrorState title="Couldn't load your earnings" onRetry={retry} />
                </Panel>
            ) : isLoading ? (
                <div aria-busy className="grid gap-4 sm:grid-cols-2">
                    {[0, 1].map((i) => <div key={i} aria-hidden className="h-[136px] animate-pulse rounded-3xl bg-white/[0.04] motion-reduce:animate-none" />)}
                </div>
            ) : !hasData ? (
                <Panel>
                    <EmptyState title="No completed trips in this period" description="Earnings count once a trip is completed. Try a longer range, or finish a trip first." />
                </Panel>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <StatCard label="Earned" value={formatINR(totals.earnedPaise, { compact: true })} icon={<IndianRupee className="size-4" />} delta={delta} meta={meta} />
                        <StatCard label="Completed trips" value={Number(totals.trips) || trips.length} icon={<Truck className="size-4" />} meta="In this period" />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-5">
                        <Panel title="Earned per day" className="lg:col-span-3">
                            <TrendArea
                                data={trend}
                                xKey="day"
                                series={[{ key: 'value', label: 'This period', accent: true }, { key: 'previous', label: 'Previous period', dashed: true }]}
                                format={compact}
                            />
                        </Panel>
                        <Panel title="Earned per vehicle" className="lg:col-span-2">
                            {vehicles.length ? <HatchedBars items={vehicles} /> : <EmptyState title="No vehicles yet" description="Trips run on your own trucks show here." />}
                        </Panel>
                    </div>

                    <DataGrid columns={columns} rows={trips} getRowId={(r) => r.id} empty={{ title: 'No trips match', description: 'Clear the search or filters.' }} />
                    <p className="text-xs text-[var(--ds-on-surface-muted)]">Earned = agreed rate + approved extras. Cancelled and unfinished trips are not counted.</p>
                </>
            )}
        </div>
    );
}
