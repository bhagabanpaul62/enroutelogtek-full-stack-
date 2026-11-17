'use client';

import { useMemo, useState } from 'react';
import { Inbox, Send } from 'lucide-react';
import { useCan } from '@/shared/hooks/useCan';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { DataGrid } from '@/shared/ui/data-grid';
import { Modal, StatusChip, TabBar } from '@/shared/ui/kit';
import { useEffect } from 'react';
import { ErrorState, SkeletonRows } from '@/shared/ui/kit';
import { getAwardAllocationsApi, listOffersApi, listPlacedApi } from '../api/allocation.api';
import { ALLOC_PERMS, ALLOC_STATUS, TYPE_LABEL, countdown, isOpen, lane, money, when } from '../lib/allocation';
import { useNow } from '../lib/useNow';
import OfferModal from './OfferModal';
import OfferSidePanel from './OfferSidePanel';

/**
 * Loads page for a fleet owner or a broker.
 *   companyType 'fleet_owner' -> offers inbox only.
 *   companyType 'broker'      -> "Received" + "Placed" tabs; accepted received rows can be placed onward.
 */
export default function OffersPage({ companyType }) {
    const isBroker = companyType === 'broker';
    const [tab, setTab] = useState('received');
    const home = isBroker ? '/broker' : '/fleet-owner';
    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Loads</h1>
                <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">
                    {isBroker ? 'Trucks transporters offered you, and what you placed onward.' : 'Trucks transporters offered you. Accept or decline each one.'}
                </p>
            </header>
            {isBroker ? (
                <TabBar label="Loads" value={tab} onChange={setTab} panelId="loads-panel" tabs={[{ id: 'received', label: 'Received' }, { id: 'placed', label: 'Placed' }]} />
            ) : null}
            <div id="loads-panel">{tab === 'received' ? <Received isBroker={isBroker} home={home} /> : <Placed />}</div>
        </div>
    );
}

function Received({ isBroker, home }) {
    const canRespond = useCan(ALLOC_PERMS.respond);
    const now = useNow();
    const [status, setStatus] = useState('');
    const list = useCursorList(listOffersApi, { status }, { pageSize: 25 });
    const [selectedId, setSelectedId] = useState(null);
    const [placing, setPlacing] = useState(null);
    const selected = list.items.find((o) => o.id === selectedId) ?? null;

    const columns = useMemo(
        () => [
            { key: 'loadNumber', label: 'Load', type: 'text', width: 130 },
            { key: 'lane', label: 'Route', type: 'text', value: lane },
            { key: 'pickupDate', label: 'Pickup', type: 'date', width: 110 },
            { key: 'quantity', label: 'Trucks', type: 'number', width: 90 },
            { key: 'ratePerTruckPaise', label: 'Rate per truck', type: 'text', value: (r) => money(r.ratePerTruckPaise), width: 140 },
            { key: 'from', label: 'Offered by', type: 'text', value: (r) => r.from?.name ?? '' },
            {
                key: 'respondBy',
                label: 'Respond by',
                type: 'text',
                value: (r) => (r.status === 'offered' ? countdown(r.respondBy, now) : when(r.respondedAt ?? r.respondBy)),
                width: 130,
            },
            {
                key: 'status',
                label: 'Status',
                type: 'text',
                value: (r) => r.status,
                render: (r) => <StatusChip value={r.status === 'offered' && !isOpen(r, now) ? 'expired' : r.status} options={ALLOC_STATUS} />,
                width: 130,
            },
        ],
        [now],
    );

    return (
        <>
            <DataGrid
                columns={columns}
                list={list}
                onRowClick={(row) => setSelectedId(row.id)}
                searchPlaceholder="Search load or transporter"
                toolbar={
                    <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-xl bg-white/[0.06] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)]">
                        <option value="">All offers</option>
                        {ALLOC_STATUS.filter((s) => s.value !== 'withdrawn').map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                }
                empty={{
                    icon: Inbox,
                    title: status ? 'No offers with this status' : 'No offers yet',
                    description: status ? 'Try another status.' : 'When a transporter you are connected with offers you trucks, it shows up here.',
                }}
            />
            {selected ? (
                <OfferSidePanel
                    offer={selected}
                    now={now}
                    canRespond={canRespond}
                    tripsHref={`${home}/trips`}
                    onPlace={isBroker && selected.status === 'accepted' ? () => { setPlacing(selected); setSelectedId(null); } : undefined}
                    onClose={() => setSelectedId(null)}
                    onChanged={() => list.reload()}
                />
            ) : null}
            {placing ? <PlaceOnward parent={placing} networkHref={`${home}/network`} onClose={() => setPlacing(null)} onDone={() => list.reload()} /> : null}
        </>
    );
}

/** Loads how many trucks of the broker's accepted allocation are still free, then opens the offer modal. */
function PlaceOnward({ parent, networkHref, onClose, onDone }) {
    const [state, setState] = useState({ loading: true, error: '', free: 0 });
    useEffect(() => {
        let ignore = false;
        getAwardAllocationsApi(parent.awardId)
            .then((d) => !ignore && setState({ loading: false, error: '', free: d.free ?? 0 }))
            .catch(() => !ignore && setState({ loading: false, error: 'Could not check how many trucks are free.', free: 0 }));
        return () => {
            ignore = true;
        };
    }, [parent.awardId]);
    if (state.loading || state.error)
        return (
            <Modal open onOpenChange={(v) => !v && onClose()} size="sm" title="Place with your network">
                {state.loading ? <SkeletonRows rows={2} /> : <ErrorState title="Couldn't load" description={state.error} onRetry={onClose} />}
            </Modal>
        );
    if (state.free < 1)
        return (
            <Modal open onOpenChange={(v) => !v && onClose()} size="sm" title="Nothing left to place" description="All trucks of this offer are already placed with your network.">
                <p className="text-sm text-[var(--ds-on-surface-muted)]">If a partner declines or lets an offer expire, the trucks come back here.</p>
            </Modal>
        );
    return <OfferModal open onOpenChange={(v) => !v && onClose()} awardId={parent.awardId} free={state.free} parent={parent} networkHref={networkHref} onDone={onDone} />;
}

function Placed() {
    const now = useNow();
    const list = useCursorList(listPlacedApi, {}, { pageSize: 25 });
    const columns = useMemo(
        () => [
            { key: 'loadNumber', label: 'Load', type: 'text', width: 130 },
            { key: 'to', label: 'Placed with', type: 'text', value: (r) => `${r.to?.name ?? ''}${r.to?.type ? ` (${TYPE_LABEL[r.to.type] ?? r.to.type})` : ''}` },
            { key: 'quantity', label: 'Trucks', type: 'number', width: 90 },
            { key: 'ratePerTruckPaise', label: 'Rate per truck', type: 'text', value: (r) => money(r.ratePerTruckPaise), width: 140 },
            { key: 'respondBy', label: 'Respond by', type: 'text', value: (r) => (r.status === 'offered' ? countdown(r.respondBy, now) : when(r.respondedAt ?? r.respondBy)), width: 130 },
            { key: 'status', label: 'Status', type: 'text', value: (r) => r.status, render: (r) => <StatusChip value={r.status} options={ALLOC_STATUS} />, width: 130 },
        ],
        [now],
    );
    return (
        <DataGrid
            columns={columns}
            list={list}
            searchPlaceholder="Search load or partner"
            empty={{ icon: Send, title: 'Nothing placed yet', description: 'Accept an offer on the Received tab, then place its trucks with your network.' }}
        />
    );
}
