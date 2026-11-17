'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/primitives/select';
import { DataGrid, EmptyCell } from '@/shared/ui/data-grid';
import { ToneBadge } from '@/shared/ui/kit';
import { formatINR } from '@/shared/lib/format';
import LoadTypeBadge from '../components/LoadTypeBadge';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { LOAD_STATUS_LABELS, MAX_ATTEMPTS } from '../../constants';
import { getLoadsApi } from '../../api/loads.api';
import { formatCountdown, formatRoute } from '../../lib/format';
import { useNow } from './useNow';

const ALL = 'all';
// The statuses a transporter can filter by; drafts and "no bids" are the customer's business.
const STATUS_FILTERS = ['live', 'closed', 'awarded', 'accepted', 'in_execution', 'completed', 'cancelled'];
const STATUS_ITEMS = [
    { value: ALL, label: 'All' },
    ...STATUS_FILTERS.map((value) => ({ value, label: LOAD_STATUS_LABELS[value] })),
];

const truckOf = (load) =>
    load.vehicleType ? `${load.vehicleCount} × ${load.vehicleType.name}` : `${load.vehicleCount ?? '?'} truck(s)`;

// fields: loadNumber → text, route → text (+ customer line), truck → chip, weight → number (t),
// my best bid → money, rank → chip (L1 success, else warning), attempts → x/5, closes in → live only, status → status.
const buildColumns = (now) => [
    {
        key: 'loadNumber',
        label: 'Load',
        type: 'text',
        width: 150,
        render: (load) => (
            <span className="flex items-center gap-2">
                <span className="tabular-nums">{load.loadNumber}</span>
                {(load.viewedAt === null || load.viewedAt === undefined) && <ToneBadge label="New" tone="accent" />}
            </span>
        ),
    },
    {
        key: 'route',
        label: 'Route',
        type: 'text',
        value: (load) => `${formatRoute(load)} ${load.customer?.name ?? ''}`,
        render: (load) => (
            <span className="block min-w-0">
                <span className="block truncate text-[13px] text-foreground">{formatRoute(load)}</span>
                <span className="block truncate text-[12px] text-foreground/50">{load.customer?.name}</span>
            </span>
        ),
    },
    { key: 'loadType', label: 'Type', type: 'text', width: 80, value: (load) => load.loadType ?? '', render: (load) => (load.loadType ? <LoadTypeBadge type={load.loadType} /> : <EmptyCell />) },
    { key: 'truck', label: 'Truck', type: 'chip', value: truckOf },
    { key: 'weight', label: 'Weight (t)', type: 'number', value: (load) => (load.weightTons ? Number(load.weightTons) : null) },
    {
        key: 'myBest',
        label: 'My best bid',
        type: 'money',
        value: (load) => (load.myBid ? Math.round(Number(load.myBid.currentAmount) * 100) : null),
        // A part load is bid in ₹ per kg; say so next to the number.
        render: (load) =>
            load.myBid ? (
                <span className="whitespace-nowrap tabular-nums">
                    {formatINR(Math.round(Number(load.myBid.currentAmount) * 100))}
                    {load.priceBasis === 'per_kg' ? '/kg' : ''}
                </span>
            ) : (
                <EmptyCell />
            ),
    },
    {
        key: 'rank',
        label: 'My rank',
        type: 'number',
        value: (load) => load.myBid?.currentRank ?? null,
        render: (load) =>
            load.myBid ? (
                <ToneBadge label={`L${load.myBid.currentRank}`} tone={load.myBid.currentRank === 1 ? 'success' : 'warning'} />
            ) : (
                <span className="text-[13px] text-foreground/50">Not bid yet</span>
            ),
    },
    {
        key: 'attempts',
        label: 'Attempts',
        type: 'number',
        value: (load) => load.myBid?.attemptsUsed ?? 0,
        render: (load) => (
            <span className="tabular-nums">
                {load.myBid?.attemptsUsed ?? 0}/{load.maxAttempts ?? MAX_ATTEMPTS}
            </span>
        ),
    },
    {
        key: 'closesIn',
        label: 'Closes in',
        type: 'text',
        value: (load) => (load.status === 'live' ? load.closesAt : null),
        render: (load) =>
            load.status === 'live' ? (
                <span className="tabular-nums text-amber-300">
                    {formatCountdown(load.closesAt, now) || 'Closing now'}
                </span>
            ) : (
                <span className="text-foreground/30">—</span>
            ),
    },
    {
        key: 'status',
        label: 'Status',
        type: 'status',
        options: STATUS_FILTERS.map((value) => ({ value, label: LOAD_STATUS_LABELS[value] })),
    },
];

function BidsView() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // The status filter lives in the URL (?status=live) so refresh and the back button keep it.
    const statusParam = searchParams.get('status');
    const status = STATUS_FILTERS.includes(statusParam) ? statusParam : '';

    const list = useCursorList(getLoadsApi, { status });
    const now = useNow();
    const columns = useMemo(() => buildColumns(now), [now]);

    const setStatus = (value) => {
        const next = value === ALL ? '' : value;
        router.replace(next ? `${pathname}?status=${next}` : pathname, { scroll: false });
    };
    // shortcut: search/sort/filter run on the loaded rows (the grid's client mode), not on the API.
    const isFiltered = Boolean(status);

    return (
        <div className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-8">
            <header>
                <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Bids</h1>
                <p className="mt-1 text-[13px] text-foreground/50">
                    Loads you were invited to, your bids and where each one stands.
                </p>
            </header>

            <DataGrid
                columns={columns}
                list={list}
                onRowClick={(load) => router.push(`/transporter/bids/${load.id}`)}
                searchPlaceholder="Search by load number, customer or city"
                toolbar={
                    <Select items={STATUS_ITEMS} value={status || ALL} onValueChange={setStatus}>
                        <SelectTrigger className="w-44" aria-label="Filter by status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_ITEMS.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
                empty={
                    isFiltered
                        ? { title: 'No loads match your filters', description: 'Try another status or search term.' }
                        : {
                              title: 'No invitations yet',
                              description: 'Customers invite the transporters they are connected with.',
                              action: (
                                  <Link href="/transporter/network" className="text-[13px] text-primary underline-offset-2 hover:underline">
                                      Grow your network
                                  </Link>
                              ),
                          }
                }
            />
        </div>
    );
}

/** /transporter/bids: every load this company was invited to, with a status filter and search. */
export default function BidsPage() {
    // useSearchParams() needs a Suspense boundary in the App Router.
    return (
        <Suspense fallback={null}>
            <BidsView />
        </Suspense>
    );
}
