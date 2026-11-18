'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Eye, FileUp, Plus } from 'lucide-react';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useCan } from '@/shared/hooks/useCan';
import { DataGrid, EmptyCell, applyFilters, sortRows } from '@/shared/ui/data-grid';
import { TabBar } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import { formatCountdown } from '@/features/loads/lib/format';
import { useNow } from '@/features/loads/ui/customer/useNow';
import { listRfqsApi } from '../../api/rfq.api';
import { RFQ_PERMISSIONS, RFQ_STATUS_TABS, formatPeriod } from '../../lib/rfq';

const BASE = '/customer/rfqs';
const TAB_IDS = RFQ_STATUS_TABS.map((t) => t.id);

// Drafts reopen in the editor where they were left; everything else opens the record page.
const rfqHref = (rfq) => (rfq.status === 'draft' ? `${BASE}/${rfq.id}/edit` : `${BASE}/${rfq.id}`);

function buildColumns(now) {
    return [
        { key: 'number', label: 'RFQ', type: 'text', width: 140 },
        {
            key: 'title',
            label: 'Title',
            type: 'text',
            render: (rfq) => <span className="block truncate font-medium">{rfq.title || 'Untitled RFQ'}</span>,
        },
        { key: 'status', label: 'Status', type: 'status' },
        {
            key: 'validity',
            label: 'Contract period',
            type: 'text',
            value: (rfq) => formatPeriod(rfq),
        },
        { key: 'laneCount', label: 'Lanes', type: 'number', value: (rfq) => rfq.laneCount ?? 0 },
        {
            key: 'quoted',
            label: 'Quoted',
            type: 'text',
            value: (rfq) => (rfq.status === 'draft' ? '' : `${rfq.quotedCount ?? 0} of ${rfq.inviteeCount ?? 0}`),
            render: (rfq) =>
                rfq.status === 'draft' ? <EmptyCell /> : (
                    <span className="whitespace-nowrap tabular-nums">
                        {rfq.quotedCount ?? 0} of {rfq.inviteeCount ?? 0}
                    </span>
                ),
        },
        {
            key: 'closesAt',
            label: 'Closes in',
            type: 'datetime',
            value: (rfq) => (rfq.status === 'open' ? rfq.closesAt : null),
            render: (rfq) => {
                if (rfq.status !== 'open') return <EmptyCell />;
                const left = formatCountdown(rfq.closesAt, now);
                return <span className="whitespace-nowrap tabular-nums text-primary">{left || 'Closing…'}</span>;
            },
        },
    ];
}

function RfqsView() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // The status tab lives in the URL (?status=open) so refresh and the back button keep it.
    const statusParam = searchParams.get('status');
    const tab = TAB_IDS.includes(statusParam) ? statusParam : 'all';
    const status = tab === 'all' ? '' : tab;

    const [query, setQuery] = useState({ search: '', filters: [], sort: null });
    const canManage = useCan(RFQ_PERMISSIONS.MANAGE);
    const now = useNow();
    const list = useCursorList(listRfqsApi, { status, q: query.search.trim() });
    const columns = useMemo(() => buildColumns(now), [now]);

    const rows = useMemo(() => {
        let out = applyFilters(list.items, columns, query.filters);
        const column = query.sort && columns.find((c) => c.key === query.sort.key);
        if (column) out = sortRows(out, column, query.sort.dir);
        return out;
    }, [list.items, columns, query]);

    const setTab = (next) =>
        router.replace(next === 'all' ? pathname : `${pathname}?status=${next}`, { scroll: false });

    const actions = canManage ? (
        <div className="flex flex-wrap items-center gap-2">
            <Button size="lg" variant="secondary" nativeButton={false} render={<Link href={`${BASE}/import`} />}>
                <FileUp /> Import lanes
            </Button>
            <Button size="lg" nativeButton={false} render={<Link href={`${BASE}/new`} />}>
                <Plus /> New RFQ
            </Button>
        </div>
    ) : null;

    const isFiltered = Boolean(status || query.search.trim());

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">RFQs</h1>
                    <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">
                        Ask your transporters to quote monthly lanes, compare the rates, and award each lane into a contract.
                    </p>
                </div>
                {actions}
            </header>

            {!canManage && (
                <p className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px] text-[var(--ds-on-surface-variant)]">
                    <Eye size={14} className="shrink-0 text-primary" aria-hidden />
                    View only. Admins, co-admins and bid managers create RFQs and award lanes.
                </p>
            )}

            <TabBar label="Filter RFQs by status" tabs={RFQ_STATUS_TABS} value={tab} onChange={setTab} panelId="rfq-grid" />

            <div id="rfq-grid">
                <DataGrid
                    columns={columns}
                    rows={rows}
                    list={list}
                    onQueryChange={setQuery}
                    onRowClick={(rfq) => router.push(rfqHref(rfq))}
                    searchPlaceholder="Search by RFQ number or title"
                    empty={
                        isFiltered
                            ? { title: 'No RFQs match', description: 'Try another status or search term.' }
                            : {
                                  title: 'No RFQs yet',
                                  description: canManage
                                      ? 'Create one, or import your lanes from a CSV file.'
                                      : 'RFQs your company creates will show up here.',
                                  action: actions,
                              }
                    }
                />
            </div>
        </div>
    );
}

/** /customer/rfqs: every RFQ of the company, by status tab and search. */
export default function RfqsPage() {
    // useSearchParams() needs a Suspense boundary in the App Router.
    return (
        <Suspense fallback={null}>
            <RfqsView />
        </Suspense>
    );
}
