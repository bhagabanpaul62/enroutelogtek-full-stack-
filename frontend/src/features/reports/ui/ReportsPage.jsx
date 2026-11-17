'use client';

import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, IndianRupee, Truck } from 'lucide-react';
import { DataGrid } from '@/shared/ui/data-grid';
import { EmptyState, ErrorState, HatchedBars, Panel, SegmentedControl, StatCard, TrendArea, formatINR } from '@/shared/ui/kit';
import { dayLabel, rangeFor, useReportData } from '../lib/report';
import { getReportApi } from '../api/reports.api';
import { ExportButtons, RangeControl, deltaFor } from './parts';

// One page for all four company types; only the words differ. The server scopes every number to the signed-in company.
const MONEY = { customer: 'Freight spend', transporter: 'Revenue', broker: 'Placed value', fleet_owner: 'Earned' };
const PARTY = { customer: 'Transporter', transporter: 'Customer', broker: 'Placed with', fleet_owner: 'Transporter' };
const SPLIT = { customer: 'Spend by lane', transporter: 'Revenue by lane', broker: 'Placed value by lane', fleet_owner: 'Earned by lane' };

const BUCKETS = [
    { value: 'all', label: 'All trips' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];
const STATUS_OPTIONS = ['planned', 'reported', 'loading', 'loaded', 'in_transit', 'delayed', 'reached_drop', 'delivered', 'completed', 'cancelled'].map((value) => ({ value }));

const compact = (p) => formatINR(p, { compact: true });

/**
 * Trips report for one company type: KPIs vs the previous period, trend, split by lane, the rows behind them, export.
 * Data comes from getReportApi (adapts GET /reports/spend or /earnings): { kpis: { trips, completed, amountPaise: { value, previous } }, trend: [{ date, value, previous }], byLane: [{ label, amountPaise, trips }], rows: [...] }.
 * @param {{ companyType: 'customer'|'transporter'|'broker'|'fleet_owner' }} props
 */
export default function ReportsPage({ companyType }) {
    const [days, setDays] = useState('30');
    const [bucket, setBucket] = useState('all');
    const params = useMemo(() => ({ ...rangeFor(days), bucket }), [days, bucket]);
    const fetcher = useCallback((p) => getReportApi(p, companyType), [companyType]);
    const { data, error, isLoading, retry } = useReportData(fetcher, params);

    const money = MONEY[companyType] ?? 'Value';
    const kpis = data?.kpis ?? {};
    const rows = data?.rows ?? [];
    const trend = (data?.trend ?? []).map((p) => ({ ...p, day: dayLabel(p.date) }));
    const lanes = (data?.byLane ?? []).slice(0, 8).map((l) => ({ key: l.label, label: l.label, value: l.amountPaise, display: compact(l.amountPaise) }));
    const hasData = rows.length > 0 || Number(kpis.trips?.value) > 0;

    const columns = useMemo(
        () => [
            { key: 'tripNo', label: 'Trip', type: 'text', width: 150 },
            { key: 'date', label: 'Date', type: 'date', width: 110 },
            { key: 'lane', label: 'Lane', type: 'text' },
            { key: 'party', label: PARTY[companyType] ?? 'Company', type: 'text' },
            { key: 'vehicle', label: 'Vehicle', type: 'text', width: 140 },
            { key: 'status', label: 'Status', type: 'status', options: STATUS_OPTIONS, width: 130 },
            { key: 'amountPaise', label: money, type: 'money', width: 130 },
        ],
        [companyType, money],
    );

    const card = (key, label, icon, format, good) => {
        const k = kpis[key] ?? { value: 0, previous: null };
        const { delta, meta } = deltaFor(k.value, k.previous, good);
        return <StatCard label={label} value={format ? format(k.value) : Number(k.value) || 0} icon={icon} delta={delta} meta={meta} />;
    };

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Reports</h1>
                    <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">Trips and {money.toLowerCase()} for the period, against the period before it.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <RangeControl value={days} onChange={setDays} />
                    <ExportButtons companyType={companyType} params={params} disabled={isLoading || !hasData} />
                </div>
            </header>

            <SegmentedControl label="Trip status" size="sm" options={BUCKETS} value={bucket} onChange={setBucket} />

            {error ? (
                <Panel>
                    <ErrorState title="Couldn't load this report" onRetry={retry} />
                </Panel>
            ) : isLoading ? (
                <div aria-busy className="grid gap-4 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => <div key={i} aria-hidden className="h-[136px] animate-pulse rounded-3xl bg-white/[0.04] motion-reduce:animate-none" />)}
                </div>
            ) : !hasData ? (
                <Panel>
                    <EmptyState title="No trips in this period" description="Try a longer range or another status. Trips appear here as soon as they are planned." />
                </Panel>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {card('trips', 'Trips', <Truck className="size-4" />, null, null)}
                        {card('completed', 'Completed trips', <CheckCircle2 className="size-4" />, null, 'up')}
                        {card('amountPaise', money, <IndianRupee className="size-4" />, compact, null)}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-5">
                        <Panel title={`${money} per day`} className="lg:col-span-3">
                            <TrendArea
                                data={trend}
                                xKey="day"
                                series={[{ key: 'value', label: 'This period', accent: true }, { key: 'previous', label: 'Previous period', dashed: true }]}
                                format={compact}
                            />
                        </Panel>
                        <Panel title={SPLIT[companyType]} className="lg:col-span-2">
                            {lanes.length ? <HatchedBars items={lanes} /> : <EmptyState title="No lanes yet" description="Lanes appear once a trip has a pickup and a drop." />}
                        </Panel>
                    </div>

                    <DataGrid columns={columns} rows={rows} getRowId={(r) => r.id} empty={{ title: 'No trips match', description: 'Clear the search or filters.' }} />
                </>
            )}
        </div>
    );
}
