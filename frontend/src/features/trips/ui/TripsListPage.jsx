'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { DataGrid, EmptyCell } from '@/shared/ui/data-grid';
import { TabBar, ToneBadge } from '@/shared/ui/kit';
import { getTripsApi } from '../api/trips.api';
import { rowView } from '../lib/trip';
import { useTripSide } from '../hooks/useTripSide';
import TripStatus from './TripStatus';

const STATUS_OPTIONS = ['planned', 'reported', 'loading', 'loaded', 'in_transit', 'delayed', 'reached_drop', 'delivered', 'completed', 'cancelled'].map((value) => ({ value }));

const TABS = [
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'all', label: 'All' },
];
// The API's status=active means every status except completed and cancelled.
const SERVER_STATUS = { active: 'active', completed: 'completed', cancelled: 'cancelled' };

/** Every trip the signed-in company can see. Customer sees its loads' trucks; the rest see trips they run. */
export default function TripsListPage() {
    const router = useRouter();
    const { side, base } = useTripSide();
    const [tab, setTab] = useState('active');
    const list = useCursorList(getTripsApi, { role: side, status: SERVER_STATUS[tab] });
    const rows = useMemo(() => list.items.map(rowView), [list.items]);

    const columns = useMemo(
        () => [
            { key: 'tripNo', label: 'Trip', type: 'text', width: 190 },
            { key: 'route', label: 'Route', type: 'text' },
            { key: 'vehicle', label: 'Vehicle', type: 'text', width: 140 },
            {
                key: 'driver',
                label: 'Driver',
                type: 'person',
                value: (r) => (r.driverName ? { name: r.driverName, sub: r.driverPhone } : ''),
            },
            { key: 'status', label: 'Status', type: 'status', options: STATUS_OPTIONS, render: (r) => <TripStatus value={r.status} />, width: 130 },
            { key: 'etaAt', label: 'ETA', type: 'datetime', width: 150 },
            {
                key: 'delayed',
                label: 'Delayed',
                type: 'boolean',
                width: 110,
                render: (r) => (r.delayed ? <ToneBadge label="Delayed" tone="warning" /> : <EmptyCell />),
            },
            {
                key: 'pod',
                label: 'POD',
                type: 'chip',
                width: 110,
                options: [{ value: 'Pending' }, { value: 'Uploaded' }],
            },
        ],
        [],
    );

    const open = (row) => router.push(`${base}/trips/${row.id}`);

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 text-[var(--ds-on-surface)] sm:p-6 lg:p-8">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Trips</h1>
                <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">
                    {side === 'customer' ? 'Every truck on your loads, from dispatch to proof of delivery.' : 'Dispatch to proof of delivery for every truck you run.'}
                </p>
            </header>
            <TabBar label="Trip status" value={tab} onChange={setTab} tabs={TABS} />
            <DataGrid
                columns={columns}
                rows={rows}
                isLoading={list.isLoading}
                error={list.error}
                onRetry={list.reload}
                hasMore={list.hasMore}
                onLoadMore={list.loadMore}
                loadingMore={list.loadingMore}
                onRowClick={open}
                rowActions={[{ label: 'Open trip', icon: Eye, onClick: open }]}
                searchPlaceholder="Search trips"
                empty={{
                    title: tab === 'all' ? 'No trips yet' : `No ${tab} trips`,
                    description: side === 'customer' ? 'A trip appears for every truck once you award a load and the transporter accepts.' : 'A trip appears for every truck once you accept an award.',
                }}
            />
        </div>
    );
}
