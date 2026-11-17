'use client';

import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Eye, Plus } from 'lucide-react';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { DataGrid, EmptyCell, applyFilters, sortRows } from '@/shared/ui/data-grid';
import { Button } from '@/shared/ui/primitives/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/primitives/select';
import { formatWeight } from '@/shared/lib/format';
import { getLoadsApi } from '../../api/loads.api';
import { LOAD_STATUS_LABELS } from '../../constants';
import { useCan } from '@/shared/hooks/useCan';
import { PERMISSIONS } from '@/shared/lib/permissions';
import { formatCountdown, formatRoute } from '../../lib/format';
import { useNow } from './useNow';
import ModePickerModal from './ModePickerModal';

const ALL = 'all';
const STATUS_OPTIONS = [
    { value: 'expired', label: 'No bids' },
    { value: 'in_execution', label: 'In transit' },
];
const NEW_PATH = '/customer/loads/new'; // used by loadHref to resume a draft
const STATUS_ITEMS = [
    { value: ALL, label: 'All statuses' },
    ...Object.entries(LOAD_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

// Drafts open in the wizard where they were left; everything else opens its page.
const loadHref = (load) => (load.status === 'draft' ? `${NEW_PATH}?id=${load.id}` : `/customer/loads/${load.id}`);
const hasRoute = (load) => Boolean(load.pickupCity || load.pickupPinCode || load.dropCity || load.dropPinCode);
const toPaise = (rupees) => (rupees === null || rupees === undefined || rupees === '' ? null : Math.round(Number(rupees) * 100));

function buildColumns(now) {
    return [
        { key: 'loadNumber', label: 'Load', type: 'text', width: 120 },
        { key: 'status', label: 'Status', type: 'status', options: STATUS_OPTIONS },
        {
            key: 'route',
            label: 'Route',
            type: 'text',
            value: (load) => (hasRoute(load) ? formatRoute(load) : ''),
            render: (load) => (hasRoute(load) ? <span className="block truncate font-medium">{formatRoute(load)}</span> : <span className="text-foreground/40">Not entered yet</span>),
        },
        {
            key: 'truck',
            label: 'Truck',
            type: 'chip',
            value: (load) => (load.vehicleType ? `${load.vehicleCount ?? 1} × ${load.vehicleType.name}` : ''),
        },
        { key: 'weight', label: 'Weight', type: 'number', value: (load) => (load.weightTons ? Number(load.weightTons) * 1000 : null), render: (load) => (load.weightTons ? <span className="tabular-nums">{formatWeight(Number(load.weightTons) * 1000)}</span> : <EmptyCell />) },
        { key: 'target', label: 'Target price', type: 'money', value: (load) => toPaise(load.targetPrice) },
        { key: 'pickupDate', label: 'Pickup', type: 'date' },
        { key: 'bidCount', label: 'Bids', type: 'number', value: (load) => load.bidCount ?? 0 },
        {
            key: 'closesAt',
            label: 'Closes in',
            type: 'datetime',
            value: (load) => (load.status === 'live' ? load.closesAt : null),
            render: (load) => {
                if (load.status !== 'live') return <EmptyCell />;
                const left = formatCountdown(load.closesAt, now);
                return <span className="whitespace-nowrap tabular-nums text-primary">{left || 'Closing…'}</span>;
            },
        },
    ];
}

function LoadsView() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // The status filter lives in the URL (?status=live) so refresh and the back button keep it.
    const statusParam = searchParams.get('status') ?? '';
    const status = Object.hasOwn(LOAD_STATUS_LABELS, statusParam) ? statusParam : '';

    const [query, setQuery] = useState({ search: '', filters: [], sort: null });
    const canManage = useCan(PERMISSIONS.LOADS_MANAGE);
    const now = useNow();
    // The server searches by city or load number; filters and sort run on the loaded rows.
    const list = useCursorList(getLoadsApi, { status, search: query.search.trim() });
    const [modeOpen, setModeOpen] = useState(false);
    const columns = useMemo(() => buildColumns(now), [now]);

    const rows = useMemo(() => {
        let out = applyFilters(list.items, columns, query.filters);
        const column = query.sort && columns.find((c) => c.key === query.sort.key);
        if (column) out = sortRows(out, column, query.sort.dir);
        return out;
    }, [list.items, columns, query]);

    const setStatus = (value) =>
        router.replace(!value || value === ALL ? pathname : `${pathname}?status=${value}`, { scroll: false });

    const isFiltered = Boolean(status || query.search.trim());
    const newButton = canManage ? (
        <Button size="lg" onClick={() => setModeOpen(true)}>
            <Plus /> New load
        </Button>
    ) : null;

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Loads</h1>
                    <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">
                        Post a load, invite your transporters to bid, and pick the winner.
                    </p>
                </div>
                {newButton}
            </header>

            {!canManage && (
                <p className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px] text-[var(--ds-on-surface-variant)]">
                    <Eye size={14} className="shrink-0 text-primary" aria-hidden />
                    View only. Admins, co-admins and bid managers post loads and pick winners.
                </p>
            )}

            <DataGrid
                columns={columns}
                rows={rows}
                list={list}
                onQueryChange={setQuery}
                onRowClick={(load) => router.push(loadHref(load))}
                searchPlaceholder="Search by city or load number"
                toolbar={
                    <Select items={STATUS_ITEMS} value={status || ALL} onValueChange={setStatus}>
                        <SelectTrigger className="h-8 w-44 rounded-xl border-0 bg-white/[0.05]" aria-label="Filter by status">
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
                        ? { title: 'No loads match', description: 'Try another status or search term.' }
                        : {
                              title: 'No loads yet',
                              description: canManage
                                  ? 'Post your first load: choose Ad Hoc, then enter the route, the material and the trucks.'
                                  : 'Loads your company posts will show up here.',
                              action: newButton,
                          }
                }
            />

            <ModePickerModal open={modeOpen} onClose={() => setModeOpen(false)} />
        </div>
    );
}

/** /customer/loads: every load of the company, filtered by status and search. */
export default function LoadsPage() {
    // useSearchParams() needs a Suspense boundary in the App Router.
    return (
        <Suspense fallback={null}>
            <LoadsView />
        </Suspense>
    );
}
