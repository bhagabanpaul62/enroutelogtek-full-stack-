'use client';

import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { DataGrid, EmptyCell, applyFilters, sortRows } from '@/shared/ui/data-grid';
import { StatusChip, TabBar, ToneBadge } from '@/shared/ui/kit';
import { formatCountdown } from '@/features/loads/lib/format';
import { useNow } from '@/features/loads/ui/customer/useNow';
import { listRfqsApi } from '../../api/rfq.api';
import { RFQ_STATUS_TABS, formatPeriod } from '../../lib/rfq';

const BASE = '/transporter/rfqs';
// Drafts are never visible to a transporter.
const TABS = RFQ_STATUS_TABS.filter((t) => t.id !== 'draft');
const TAB_IDS = TABS.map((t) => t.id);

function buildColumns(now) {
    return [
        { key: 'number', label: 'RFQ', type: 'text', width: 170 },
        { key: 'customer', label: 'Customer', type: 'text', value: (r) => r.customer?.name ?? '' },
        { key: 'title', label: 'Title', type: 'text', render: (r) => <span className="block truncate font-medium">{r.title}</span> },
        {
            key: 'status',
            label: 'Status',
            type: 'status',
            render: (r) => (
                <span className="flex flex-wrap items-center gap-1.5">
                    <StatusChip value={r.status} />
                    {r.awardPending && <ToneBadge label="Award waiting" tone="warning" />}
                </span>
            ),
        },
        { key: 'validity', label: 'Contract period', type: 'text', value: (r) => formatPeriod(r) },
        {
            key: 'mine',
            label: 'My quotes',
            type: 'text',
            value: (r) => `${r.myQuotedLanes ?? 0} of ${r.laneCount ?? 0}`,
            render: (r) => (
                <span className="whitespace-nowrap tabular-nums">
                    {r.myQuotedLanes ?? 0} of {r.laneCount ?? 0}
                </span>
            ),
        },
        {
            key: 'closesAt',
            label: 'Closes in',
            type: 'datetime',
            value: (r) => (r.status === 'open' ? r.closesAt : null),
            render: (r) => {
                if (r.status !== 'open') return <EmptyCell />;
                const left = formatCountdown(r.closesAt, now);
                return <span className="whitespace-nowrap tabular-nums text-primary">{left || 'Closing…'}</span>;
            },
        },
    ];
}

function RfqsView() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const statusParam = searchParams.get('status');
    const tab = TAB_IDS.includes(statusParam) ? statusParam : 'all';
    const status = tab === 'all' ? '' : tab;
    const [query, setQuery] = useState({ search: '', filters: [], sort: null });
    const now = useNow();
    const list = useCursorList(listRfqsApi, { status, q: query.search.trim() });
    const columns = useMemo(() => buildColumns(now), [now]);

    const rows = useMemo(() => {
        let out = applyFilters(list.items, columns, query.filters);
        const column = query.sort && columns.find((c) => c.key === query.sort.key);
        if (column) out = sortRows(out, column, query.sort.dir);
        return out;
    }, [list.items, columns, query]);

    const waiting = list.items.filter((r) => r.awardPending).length;

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">RFQs</h1>
                <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">Customers invite you to quote monthly lanes. Quote each lane you want, and answer any award before its time runs out.</p>
            </header>

            {waiting > 0 && (
                <p role="status" className="rounded-2xl bg-amber-400/10 px-4 py-3 text-[13px] text-amber-300">
                    {waiting} {waiting === 1 ? 'RFQ has' : 'RFQs have'} awarded lanes waiting for your answer.
                </p>
            )}

            <TabBar label="Filter RFQs by status" tabs={TABS} value={tab} onChange={(next) => router.replace(next === 'all' ? pathname : `${pathname}?status=${next}`, { scroll: false })} panelId="rfq-grid" />

            <div id="rfq-grid">
                <DataGrid
                    columns={columns}
                    rows={rows}
                    list={list}
                    onQueryChange={setQuery}
                    onRowClick={(rfq) => router.push(`${BASE}/${rfq.id}`)}
                    searchPlaceholder="Search by RFQ number or title"
                    empty={
                        status || query.search.trim()
                            ? { title: 'No RFQs match', description: 'Try another status or search term.' }
                            : { title: 'No RFQs yet', description: 'When a customer invites you to quote lanes, the RFQ shows up here.' }
                    }
                />
            </div>
        </div>
    );
}

/** /transporter/rfqs: RFQs the company is invited to. */
export default function TransporterRfqsPage() {
    return (
        <Suspense fallback={null}>
            <RfqsView />
        </Suspense>
    );
}
