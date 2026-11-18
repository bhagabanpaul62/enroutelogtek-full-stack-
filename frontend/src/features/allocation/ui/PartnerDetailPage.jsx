'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Inbox } from 'lucide-react';
import { formatDate } from '@/shared/lib/format';
import { useCan } from '@/shared/hooks/useCan';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { DataGrid } from '@/shared/ui/data-grid';
import { ErrorState, Panel, SkeletonRows, StatCard, StatusChip } from '@/shared/ui/kit';
import { apiMessage, getPartnerApi, listOffersApi, listPlacedApi } from '../api/allocation.api';
import { ALLOC_PERMS, ALLOC_STATUS, TYPE_LABEL, countdown, isOpen, lane, money, when } from '../lib/allocation';
import { useNow } from '../lib/useNow';
import OfferSidePanel from './OfferSidePanel';

const BACK = {
    transporter: { href: '/broker/transporters', label: 'Transporters' },
    fleet_owner: { href: '/broker/fleet-owners', label: 'Fleet owners' },
};

/**
 * One connected partner. Transporter: the offers they made to me (Received). Fleet owner: the offers I placed
 * with them (Placed). Rows open the same offer side panel as the Loads page; only a transporter's offer can be answered here.
 */
export default function PartnerDetailPage({ type, companyId }) {
    const incoming = type === 'transporter';
    const back = BACK[type] ?? BACK.transporter;
    const canRespond = useCan(ALLOC_PERMS.respond);
    const now = useNow();

    const [summary, setSummary] = useState({ loading: true, error: '', data: null });
    const [summaryTick, setSummaryTick] = useState(0);
    const loadSummary = () => {
        setSummary((prev) => ({ ...prev, loading: true, error: '' }));
        setSummaryTick((n) => n + 1);
    };
    useEffect(() => {
        let ignore = false;
        getPartnerApi(companyId)
            .then((data) => !ignore && setSummary({ loading: false, error: '', data }))
            .catch((e) => !ignore && setSummary({ loading: false, error: apiMessage(e, 'Could not load this partner.'), data: null }));
        return () => { ignore = true; };
    }, [companyId, summaryTick]);

    const list = useCursorList(incoming ? listOffersApi : listPlacedApi, { companyId }, { pageSize: 25 });
    const [selectedId, setSelectedId] = useState(null);
    const selected = list.items.find((o) => o.id === selectedId) ?? null;
    const name = summary.data?.company?.name ?? '';

    const columns = useMemo(
        () => [
            { key: 'loadNumber', label: 'Load', type: 'text', width: 160 },
            { key: 'lane', label: 'Route', type: 'text', value: lane },
            { key: 'pickupDate', label: 'Pickup', type: 'date', width: 110 },
            { key: 'quantity', label: 'Trucks', type: 'number', width: 90 },
            { key: 'ratePerTruckPaise', label: 'Rate per truck', type: 'text', value: (r) => money(r.ratePerTruckPaise), width: 140 },
            {
                key: 'status',
                label: 'Status',
                type: 'text',
                value: (r) => r.status,
                render: (r) => <StatusChip value={r.status === 'offered' && !isOpen(r, now) ? 'expired' : r.status} options={ALLOC_STATUS} />,
                width: 130,
            },
            { key: 'respondBy', label: 'Respond by', type: 'text', value: (r) => (r.status === 'offered' ? countdown(r.respondBy, now) : when(r.respondedAt ?? r.respondBy)), width: 130 },
        ],
        [now],
    );

    const s = summary.data;
    return (
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 px-4 py-6 lg:px-8">
            <Link href={back.href} className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--ds-on-surface-muted)] hover:text-[var(--ds-on-surface)]">
                <ArrowLeft className="size-4" aria-hidden />
                {back.label}
            </Link>

            {summary.loading ? (
                <SkeletonRows rows={3} />
            ) : summary.error ? (
                <ErrorState title="Couldn't load this partner" description={summary.error} onRetry={loadSummary} />
            ) : (
                <>
                    <header>
                        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">{name}</h1>
                        <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">
                            {[TYPE_LABEL[s.company.type], [s.company.city, s.company.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                        </p>
                    </header>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard label="Connected since" value={s.connectedSince ? formatDate(s.connectedSince) : '—'} />
                        <StatCard label={incoming ? 'Offers received' : 'Offers placed'} value={incoming ? s.offersReceived : s.placed} meta={s.openOffers ? `${s.openOffers} waiting for an answer` : undefined} />
                        <StatCard label="Accepted" value={s.accepted} meta={s.declined ? `${s.declined} declined` : undefined} />
                        <StatCard label="Accepted value" value={money(s.valuePaise) || '₹0'} />
                    </div>
                </>
            )}

            <DataGrid
                columns={columns}
                list={list}
                onRowClick={(row) => setSelectedId(row.id)}
                searchPlaceholder="Search load"
                empty={{
                    icon: incoming ? Inbox : Send,
                    title: incoming ? 'No offers from this company yet' : 'Nothing placed with this company yet',
                    description: incoming ? 'Trucks they offer you show up here.' : 'Trucks you place with them show up here.',
                }}
            />

            {selected ? (
                <OfferSidePanel
                    offer={selected}
                    now={now}
                    canRespond={incoming && canRespond}
                    onClose={() => setSelectedId(null)}
                    onChanged={() => { list.reload(); loadSummary(); }}
                />
            ) : null}
        </div>
    );
}
