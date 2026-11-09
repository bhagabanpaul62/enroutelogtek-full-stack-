'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Eye, Package, Plus, Search } from 'lucide-react';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import CursorList from '@/shared/ui/components/CursorList';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/primitives/select';
import { getLoadsApi } from '../../api/loads.api';
import { LOAD_STATUS_LABELS } from '../../constants';
import { useLoadManager } from '../../hooks/useLoadManager';
import { formatCountdown, formatDate, formatRoute } from '../../lib/format';
import StatusBadge from '../components/StatusBadge';
import { useNow } from './useNow';

const ALL = 'all';
const NEW_PATH = '/customer/loads/new';
const STATUS_ITEMS = [
    { value: ALL, label: 'All statuses' },
    ...Object.entries(LOAD_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

// Drafts open in the wizard where they were left; everything else opens its page.
const loadHref = (load) => (load.status === 'draft' ? `${NEW_PATH}?id=${load.id}` : `/customer/loads/${load.id}`);
const hasRoute = (load) => Boolean(load.pickupCity || load.pickupPinCode || load.dropCity || load.dropPinCode);

/** One load in the list: number, status, route, pickup, trucks, bids and the closing countdown. */
function LoadRow({ load, now }) {
    const closesIn = load.status === 'live' ? formatCountdown(load.closesAt, now) : '';
    const bids = load.bidCount ?? 0;
    const trucks = load.vehicleType ? `${load.vehicleCount ?? 1} × ${load.vehicleType.name}` : 'Truck not chosen';

    return (
        <li>
            <Link
                href={loadHref(load)}
                className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-[#181818] sm:flex-row sm:items-center sm:gap-4"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] text-primary">{load.loadNumber}</span>
                        <StatusBadge status={load.status} />
                    </div>
                    <p className="mt-1 truncate text-[14px] font-medium text-foreground">
                        {hasRoute(load) ? formatRoute(load) : 'Route not entered yet'}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#c6c6c7]">
                        {load.pickupDate ? `Pickup ${formatDate(load.pickupDate)}` : 'No pickup date'} · {trucks}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-[12px] text-muted-foreground sm:flex-col sm:items-end sm:gap-1">
                    <span>
                        {bids} {bids === 1 ? 'bid' : 'bids'}
                    </span>
                    {closesIn && <span className="text-primary">closes in {closesIn}</span>}
                </div>
            </Link>
        </li>
    );
}

function LoadsView() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // The status filter lives in the URL (?status=live) so refresh and the back button keep it.
    const statusParam = searchParams.get('status') ?? '';
    const status = Object.hasOwn(LOAD_STATUS_LABELS, statusParam) ? statusParam : '';

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search.trim());
    const canManage = useLoadManager();
    const now = useNow();
    const list = useCursorList(getLoadsApi, { status, search: debouncedSearch });

    const setStatus = (value) =>
        router.replace(!value || value === ALL ? pathname : `${pathname}?status=${value}`, { scroll: false });

    const isFiltered = Boolean(status || debouncedSearch);
    const newButton = canManage ? (
        <Button size="lg" nativeButton={false} render={<Link href={NEW_PATH} />}>
            <Plus /> New Ad Hoc load
        </Button>
    ) : null;

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
            <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Loads</h1>
                    <p className="mt-1 text-[13px] text-[#c6c6c7]">
                        Post a load, invite your transporters to bid, and pick the winner.
                    </p>
                </div>
                {newButton}
            </header>

            {!canManage && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-[12px] text-[#c6c6c7]">
                    <Eye size={14} className="shrink-0 text-primary" />
                    View only. Admins, co-admins and bid managers post loads and pick winners.
                </div>
            )}

            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <Search
                        size={14}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by city or load number"
                        aria-label="Search loads"
                        maxLength={100}
                        className="pl-8"
                    />
                </div>
                <Select items={STATUS_ITEMS} value={status || ALL} onValueChange={setStatus}>
                    <SelectTrigger className="w-full sm:w-52" aria-label="Filter by status">
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
            </div>

            <CursorList
                list={list}
                getKey={(load) => load.id}
                empty={
                    isFiltered
                        ? {
                              icon: Package,
                              title: 'No loads match your filters',
                              description: 'Try another status or search term.',
                          }
                        : {
                              icon: Package,
                              title: 'No loads yet',
                              description: canManage
                                  ? 'Post your first Ad Hoc load: enter the route, the material and the trucks, then invite your transporters to bid.'
                                  : 'Loads your company posts will show up here.',
                              action: newButton,
                          }
                }
                renderItem={(load) => <LoadRow load={load} now={now} />}
            />
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
