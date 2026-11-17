'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { DataGrid } from '@/shared/ui/data-grid';
import { getTripsApi } from '../api/trips.api';
import { rowView } from '../lib/trip';
import { useTripSide } from '../hooks/useTripSide';
import TripStatus from './TripStatus';
import { ToneBadge } from '@/shared/ui/kit';

const STATUS_OPTIONS = ['planned', 'reported', 'loading', 'loaded', 'in_transit', 'delayed', 'reached_drop', 'delivered', 'completed', 'cancelled'].map((value) => ({ value }));

/** Every trip the signed-in company can see. Customer sees its loads' trucks; the rest see trips they run. */
export default function TripsListPage() {
    const router = useRouter();
    const { side, base } = useTripSide();
    const list = useCursorList(getTripsApi, { role: side });
    const rows = useMemo(() => list.items.map(rowView), [list.items]);

    const columns = useMemo(
        () => [
            { key: 'tripNo', label: 'Trip', type: 'text', width: 150 },
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
                render: (r) => (r.delayed ? <ToneBadge label="Delayed" tone="warning" /> : <span className="text-[var(--ds-on-surface-muted)]">—</span>),
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
                    title: 'No trips yet',
                    description: side === 'customer' ? 'A trip appears for every truck once you award a load and the transporter accepts.' : 'A trip appears for every truck once you accept an award.',
                }}
            />
        </div>
    );
}
