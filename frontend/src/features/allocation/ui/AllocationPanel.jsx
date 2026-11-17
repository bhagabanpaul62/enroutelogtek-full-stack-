'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { useCan } from '@/shared/hooks/useCan';
import { DataGrid } from '@/shared/ui/data-grid';
import { BigStat, ErrorState, Inset, Panel, SkeletonRows, StatusChip } from '@/shared/ui/kit';
import { apiMessage, getAwardAllocationsApi, withdrawAllocationApi } from '../api/allocation.api';
import { ALLOC_PERMS, ALLOC_STATUS, countdown, money, when } from '../lib/allocation';
import { useNow } from '../lib/useNow';
import OfferModal from './OfferModal';

/**
 * Transporter: split an accepted award's trucks between own fleet, fleet owners and brokers.
 * Mount on the bid detail of an accepted award: <AllocationPanel award={award} load={load} />.
 *   award { id }  ·  load { loadNumber? } (optional, for labels)  ·  onChanged() after any offer / withdraw.
 * The rest "stays with your fleet": the existing Assign trucks flow applies to those trips.
 */
export default function AllocationPanel({ award, load, onChanged }) {
    const canManage = useCan(ALLOC_PERMS.manage);
    const now = useNow();
    const [state, setState] = useState({ loading: true, error: '', data: null });
    const [offering, setOffering] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const reload = useCallback(
        () =>
            getAwardAllocationsApi(award.id)
                .then((data) => setState({ loading: false, error: '', data }))
                .catch((e) => setState({ loading: false, error: apiMessage(e, 'Could not load the allocation.'), data: null })),
        [award.id],
    );
    useEffect(() => {
        reload();
    }, [reload]);

    const changed = () => {
        reload();
        onChanged?.();
    };

    const withdraw = useCallback(
        async (row) => {
            setBusyId(row.id);
            try {
                await withdrawAllocationApi(row.id);
                toast.success('Offer withdrawn. The trucks are back with you.');
                changed();
            } catch (e) {
                toast.error(apiMessage(e));
                reload();
            } finally {
                setBusyId(null);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [reload],
    );

    const columns = useMemo(
        () => [
            { key: 'toName', label: 'Offered to', type: 'text', value: (r) => r.to?.name ?? '' },
            { key: 'quantity', label: 'Trucks', type: 'number', width: 90 },
            { key: 'ratePerTruckPaise', label: 'Rate per truck', type: 'text', value: (r) => money(r.ratePerTruckPaise), width: 140 },
            {
                key: 'status',
                label: 'Status',
                type: 'text',
                value: (r) => r.status,
                render: (r) => (
                    <span className="flex flex-col items-start gap-1">
                        <StatusChip value={r.status} options={ALLOC_STATUS} />
                        {['declined', 'expired', 'withdrawn'].includes(r.status) ? <span className="text-xs text-[var(--ds-on-surface-muted)]">Returned to you</span> : null}
                    </span>
                ),
                width: 160,
            },
            {
                key: 'respondBy',
                label: 'Respond by',
                type: 'text',
                value: (r) => (r.status === 'offered' ? countdown(r.respondBy, now) : when(r.respondedAt ?? r.respondBy)),
                width: 130,
            },
            {
                key: 'actions',
                label: '',
                type: 'text',
                sortable: false,
                filterable: false,
                width: 120,
                render: (r) =>
                    canManage && r.status === 'offered' ? (
                        <Button type="button" variant="secondary" className="h-8 rounded-lg px-3 text-xs" disabled={busyId === r.id} onClick={(e) => { e.stopPropagation(); withdraw(r); }} aria-label={`Withdraw offer to ${r.to?.name ?? 'partner'}`}>
                            Withdraw
                        </Button>
                    ) : null,
            },
        ],
        [now, canManage, busyId, withdraw],
    );

    const d = state.data;
    return (
        <Panel
            title={load?.loadNumber ? `Allocate trucks · ${load.loadNumber}` : 'Allocate trucks'}
            action={
                canManage && d ? (
                    <Button type="button" className="h-9 rounded-xl px-4 text-sm" disabled={d.free < 1} onClick={() => setOffering(true)} aria-label="Offer trucks">
                        <Send className="mr-1.5 size-4" aria-hidden /> Offer trucks
                    </Button>
                ) : null
            }
        >
            {state.loading ? (
                <SkeletonRows rows={3} />
            ) : state.error ? (
                <ErrorState title="Couldn't load the allocation" description={state.error} onRetry={() => { setState({ loading: true, error: '', data: null }); reload(); }} />
            ) : (
                <div className="flex flex-col gap-5">
                    <Inset className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                        <BigStat label="Total trucks" value={d.totalTrucks} />
                        <BigStat label="Run by you" value={d.own} />
                        <BigStat label="Offered" value={d.offered} tone={d.offered ? 'info' : 'default'} />
                        <BigStat label="Accepted by partners" value={d.accepted} tone={d.accepted ? 'success' : 'default'} />
                        <BigStat label="Free to offer" value={d.free} hint="Still with your fleet" />
                    </Inset>
                    <DataGrid
                        columns={columns}
                        rows={d.allocations ?? []}
                        isLoading={false}
                        pageSize={10}
                        searchPlaceholder="Search partner"
                        empty={{
                            icon: Send,
                            title: 'All trucks stay with your fleet',
                            description: canManage ? 'Offer some to a fleet owner or broker, or assign your own trucks from the trips.' : 'No trucks have been offered to partners.',
                        }}
                    />
                    <p className="text-xs text-[var(--ds-on-surface-muted)]">
                        A declined, expired or withdrawn offer returns its trucks to you. An accepted offer is final.
                    </p>
                </div>
            )}
            {offering && d ? <OfferModal open onOpenChange={(v) => !v && setOffering(false)} awardId={award.id} free={d.free} networkHref="/transporter/network" onDone={changed} /> : null}
        </Panel>
    );
}
