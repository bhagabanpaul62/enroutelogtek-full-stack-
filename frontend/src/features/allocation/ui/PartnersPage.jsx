'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { DataGrid } from '@/shared/ui/data-grid';
import { listConnectionsApi, listOffersApi, listPlacedApi } from '../api/allocation.api';
import { money } from '../lib/allocation';

const COPY = {
    transporter: { title: 'Transporters', blurb: 'Transporters you are connected with and the trucks they offered you.', none: 'No transporters connected yet' },
    fleet_owner: { title: 'Fleet owners', blurb: 'Fleet owners you are connected with and the trucks you placed with them.', none: 'No fleet owners connected yet' },
};

/** Broker pages: connected companies of one type, plus what was placed with each (summed from the Placed list; accepted trucks and their value). */
export default function PartnersPage({ type, networkHref = '/broker/network' }) {
    const copy = COPY[type];
    const router = useRouter();
    const detailBase = type === 'transporter' ? '/broker/transporters' : '/broker/fleet-owners';
    const list = useCursorList(listConnectionsApi, { companyType: type }, { pageSize: 50 });
    // Fleet owners: what I placed with them. Transporters: what they offered me.
    const incoming = type === 'transporter';
    const placed = useCursorList(incoming ? listOffersApi : listPlacedApi, {}, { pageSize: 100 });

    const rows = useMemo(() => {
        const byCompany = new Map();
        for (const a of placed.items) {
            const other = incoming ? a.from : a.to;
            if (other?.id == null || !['offered', 'accepted'].includes(a.status)) continue;
            const s = byCompany.get(other.id) ?? { offered: 0, accepted: 0, value: 0 };
            s[a.status] += a.quantity;
            if (a.status === 'accepted') s.value += (a.ratePerTruckPaise ?? 0) * a.quantity;
            byCompany.set(other.id, s);
        }
        return list.items.map((c) => {
            const s = byCompany.get(c.company?.id) ?? { offered: 0, accepted: 0, value: 0 };
            return { id: c.company?.id ?? c.connectionId, name: c.company?.name ?? '', city: c.company?.city ?? '', ...s };
        });
    }, [list.items, placed.items, incoming]);

    const columns = [
        { key: 'name', label: 'Company', type: 'text' },
        { key: 'city', label: 'City', type: 'text', width: 140 },
        { key: 'accepted', label: incoming ? 'Trucks you accepted' : 'Trucks placed (accepted)', type: 'number', width: 190 },
        { key: 'offered', label: incoming ? 'Awaiting your answer' : 'Awaiting their answer', type: 'number', width: 170 },
        { key: 'value', label: incoming ? 'Value accepted' : 'Value placed', type: 'text', value: (r) => money(r.value) || '—', width: 140 },
    ];

    return (
        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-6 lg:px-8">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">{copy.title}</h1>
                <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">{copy.blurb}</p>
            </header>
            <DataGrid
                columns={columns}
                rows={rows}
                onRowClick={(row) => router.push(`${detailBase}/${row.id}`)}
                isLoading={list.isLoading}
                error={list.error}
                onRetry={list.reload}
                hasMore={list.hasMore}
                onLoadMore={list.loadMore}
                loadingMore={list.loadingMore}
                searchPlaceholder="Search company"
                empty={{ icon: Users, title: copy.none, description: 'Find and connect with companies on the Network page.', action: <a href={networkHref} className="rounded-xl bg-white/[0.06] px-3 py-2 text-[13px] font-medium hover:bg-white/[0.1]">Open Network</a> }}
            />
        </div>
    );
}
