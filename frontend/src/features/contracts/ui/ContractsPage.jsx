'use client';

import { Suspense, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Eye } from 'lucide-react';
import { DataGrid, EmptyCell } from '@/shared/ui/data-grid';
import { TabBar, TickBar, ToneBadge } from '@/shared/ui/kit';
import { getContractsApi, getIndentsApi } from '../api/contract.api';
import { CONTRACT_TABS, SIDES } from '../constants';
import { useFetchAll } from '../hooks/useFetchAll';
import { contractTypeLabel } from '@/features/rfq/lib/rfq';
import { formatDate, formatTrucks } from '../lib/format';
import IndentsTable from './IndentsTable';

const INBOX = 'indents';
const REQUESTED = { status: 'requested' };

function buildColumns(side) {
    const other = SIDES[side].counterpart;
    return [
        { key: 'number', label: 'Contract', type: 'text', width: 150 },
        {
            key: 'party',
            label: other === 'transporter' ? 'Transporter' : 'Customer',
            type: 'text',
            value: (row) => row[other]?.name ?? '',
        },
        { key: 'loadType', label: 'Type', type: 'text', width: 130, value: (row) => contractTypeLabel(row.loadType), render: (row) => <ToneBadge label={contractTypeLabel(row.loadType)} /> },
        { key: 'rfq', label: 'RFQ', type: 'text', value: (row) => row.rfq?.number ?? '', render: (row) => (row.rfq ? <span className="truncate" title={row.rfq.title}>{row.rfq.number}</span> : <EmptyCell />) },
        {
            key: 'validity',
            label: 'Period',
            type: 'date',
            value: (row) => row.validFrom,
            render: (row) => <span className="whitespace-nowrap tabular-nums">{formatDate(row.validFrom)} to {formatDate(row.validTo)}</span>,
        },
        { key: 'laneCount', label: 'Lanes', type: 'number', width: 90 },
        {
            key: 'month',
            label: 'This month',
            type: 'number',
            value: (row) => row.monthConsumed ?? 0,
            render: (row) => {
                if (!row.monthVolume) return <EmptyCell />;
                const over = row.monthConsumed > row.monthVolume;
                return (
                    <span className="flex min-w-[9rem] items-center gap-3" title={`${row.monthConsumed} of ${row.monthVolume} trucks used this month`}>
                        <TickBar className="w-20" value={(row.monthConsumed / row.monthVolume) * 100} tone={over ? 'danger' : 'info'} />
                        <span className="whitespace-nowrap text-xs tabular-nums text-[var(--ds-on-surface-variant)]">
                            {row.monthConsumed}/{row.monthVolume}
                        </span>
                        {over ? <ToneBadge label="Over" tone="danger" /> : null}
                    </span>
                );
            },
        },
        { key: 'status', label: 'Status', type: 'status' },
    ];
}

function ContractsView({ side }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isTransporter = side === 'transporter';
    const tabIds = [...CONTRACT_TABS.map((t) => t.id), ...(isTransporter ? [INBOX] : [])];
    const tabParam = searchParams.get('tab');
    const tab = tabIds.includes(tabParam) ? tabParam : 'active';
    const setTab = (next) => router.replace(next === 'active' ? pathname : `${pathname}?tab=${next}`, { scroll: false });

    const list = useFetchAll(getContractsApi, {});
    // The inbox badge: requested indents waiting on this transporter (one extra light call).
    const inbox = useFetchAll(getIndentsApi, REQUESTED, isTransporter);
    const columns = useMemo(() => buildColumns(side), [side]);

    const counts = useMemo(() => {
        const out = {};
        for (const row of list.items) out[row.status] = (out[row.status] ?? 0) + 1;
        return out;
    }, [list.items]);

    const tabs = [
        ...CONTRACT_TABS.map((t) => ({ id: t.id, label: t.label, count: counts[t.status] ?? 0 })),
        ...(isTransporter ? [{ id: INBOX, label: 'Indents inbox', count: inbox.items.length }] : []),
    ];

    const rows = useMemo(() => {
        const status = CONTRACT_TABS.find((t) => t.id === tab)?.status;
        return list.items.filter((row) => row.status === status);
    }, [list.items, tab]);

    const open = (row) => router.push(`${SIDES[side].contracts}/${row.id}`);

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Contracts</h1>
                <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">
                    {isTransporter
                        ? 'Lanes you won through RFQs. Customers place indents against them; you acknowledge each one.'
                        : 'Lanes awarded through your RFQs. Place indents against a contract when you need trucks.'}
                </p>
            </header>

            {isTransporter && inbox.items.length > 0 && tab !== INBOX ? (
                <button
                    type="button"
                    onClick={() => setTab(INBOX)}
                    className="flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-left text-[13px] text-primary transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                >
                    <Eye size={14} className="shrink-0" aria-hidden />
                    {formatTrucks(inbox.items.reduce((n, i) => n + (i.trucks ?? 0), 0))} requested across {inbox.items.length} {inbox.items.length === 1 ? 'indent' : 'indents'}. Open the inbox to answer.
                </button>
            ) : null}

            <TabBar tabs={tabs} value={tab} onChange={setTab} label="Contract status" panelId="contracts-panel" />

            <div id="contracts-panel" role="tabpanel">
                {tab === INBOX ? (
                    <IndentsTable
                        side={side}
                        list={inbox}
                        showContract
                        empty={{ title: 'Inbox is clear', description: 'New indent requests from your customers show up here.' }}
                    />
                ) : (
                    <DataGrid
                        columns={columns}
                        rows={rows}
                        isLoading={list.isLoading}
                        error={list.error}
                        onRetry={list.reload}
                                        onRowClick={open}
                        searchPlaceholder="Search by contract, RFQ or company"
                        empty={
                            list.items.length === 0
                                ? {
                                      title: 'No contracts yet',
                                      description: isTransporter
                                          ? 'A contract appears here when you accept a lane award from an RFQ.'
                                          : 'A contract appears here when a transporter accepts a lane award from your RFQ.',
                                  }
                                : { title: `No ${tab} contracts`, description: 'Try another tab.' }
                        }
                    />
                )}
            </div>
        </div>
    );
}

/** /customer/contracts and /transporter/contracts: every contract of the company by status, plus the indents inbox for transporters. */
export default function ContractsPage({ side }) {
    return (
        <Suspense fallback={null}>
            <ContractsView side={side} />
        </Suspense>
    );
}
