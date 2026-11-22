'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { DataGrid, EmptyCell } from '@/shared/ui/data-grid';
import { Modal, ModalFooter, ToneBadge } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import { acknowledgeIndentApi, cancelIndentApi, declineIndentApi } from '../api/contract.api';
import { SIDES } from '../constants';
import { errorText, formatDate, formatRate, formatTrucks, indentSize, laneRoute } from '../lib/format';
import IndentPanel from './IndentPanel';
import ReasonModal from './ReasonModal';

const stop = (e) => e.stopPropagation();

/**
 * Indents as a grid with the actions of the viewer: the transporter acknowledges or declines requested
 * ones; the customer cancels them. An acknowledged row links to its load, where trips run.
 * `list` is { items, isLoading, error, reload }. canRespond / canCancel come from the page.
 */
export default function IndentsTable({ side, list, showContract = false, canRespond = true, canCancel = true, empty, toolbar, onChanged }) {
    const [panel, setPanel] = useState(null);
    // null | { kind: 'ack' | 'decline' | 'cancel', indent }
    const [dialog, setDialog] = useState(null);
    const [busy, setBusy] = useState(false);
    const isTransporter = side === 'transporter';
    const refresh = onChanged ?? list.reload;

    const run = async (call, success) => {
        setBusy(true);
        try {
            const { data } = await call();
            toast.success(success(data.data));
            setDialog(null);
            setPanel(null);
            refresh();
        } catch (error) {
            // Stay open so the user can read the reason and retry; a 409 usually means someone answered first.
            toast.error(errorText(error));
            if (error.response?.status === 409) {
                setDialog(null);
                refresh();
            }
        } finally {
            setBusy(false);
        }
    };

    const columns = useMemo(() => {
        const base = [
            { key: 'number', label: 'Indent', type: 'text', width: 140 },
            ...(showContract
                ? [{ key: 'contractNumber', label: 'Contract', type: 'text', value: (r) => r.contractNumber ?? '' }, { key: 'party', label: isTransporter ? 'Customer' : 'Transporter', type: 'text', value: (r) => (isTransporter ? r.customer?.name : r.transporter?.name) ?? '' }]
                : []),
            { key: 'lane', label: 'Lane', type: 'text', value: (r) => (r.lane ? `${r.lane.laneNo}. ${laneRoute(r.lane)}` : '') },
            { key: 'trucks', label: 'Size', type: 'text', width: 150, value: (r) => indentSize(r) },
            { key: 'pickupDate', label: 'Pickup', type: 'date', width: 110 },
            {
                key: 'overVolumeBy',
                label: 'Volume',
                type: 'number',
                value: (r) => r.overVolumeBy ?? 0,
                render: (r) =>
                    r.overVolumeBy > 0 ? <ToneBadge label={`${formatTrucks(r.overVolumeBy, r.loadType)} over`} tone="warning" /> : <span className="text-xs text-[var(--ds-on-surface-muted)]">Within volume</span>,
            },
            {
                key: 'rate',
                label: 'Rate',
                type: 'money',
                value: (r) => r.ratePaise ?? r.indicativeRatePaise ?? null,
                render: (r) => {
                    const paise = r.ratePaise ?? r.indicativeRatePaise;
                    if (paise == null) return <EmptyCell />;
                    return <span className="whitespace-nowrap tabular-nums" title={r.ratePaise == null ? 'Expected rate; fixed at acknowledge' : 'Frozen at acknowledge'}>{formatRate(paise, r.lane?.rateBasis)}{r.ratePaise == null ? ' (est.)' : ''}</span>;
                },
            },
            { key: 'status', label: 'Status', type: 'status' },
            {
                key: 'actions',
                label: 'Action',
                type: 'text',
                sortable: false,
                filterable: false,
                value: () => '',
                render: (r) => {
                    if (r.loadId) {
                        return (
                            <Link href={SIDES[side].load(r.loadId)} onClick={stop} className="whitespace-nowrap text-[13px] text-primary hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]">
                                Open load {r.loadNumber}
                            </Link>
                        );
                    }
                    if (r.status !== 'requested') return <EmptyCell />;
                    return (
                        <span className="flex items-center gap-2" onClick={stop} onKeyDown={stop} role="presentation">
                            {isTransporter && canRespond ? (
                                <>
                                    <Button size="sm" aria-label={`Acknowledge ${r.number}`} onClick={() => setDialog({ kind: 'ack', indent: r })}>
                                        <Check /> Acknowledge
                                    </Button>
                                    <Button size="sm" variant="secondary" aria-label={`Decline ${r.number}`} onClick={() => setDialog({ kind: 'decline', indent: r })}>
                                        Decline
                                    </Button>
                                </>
                            ) : null}
                            {!isTransporter && canCancel ? (
                                <Button size="sm" variant="secondary" aria-label={`Cancel ${r.number}`} onClick={() => setDialog({ kind: 'cancel', indent: r })}>
                                    <X /> Cancel
                                </Button>
                            ) : null}
                        </span>
                    );
                },
            },
        ];
        return base;
    }, [showContract, isTransporter, canRespond, canCancel, side]);

    const ind = dialog?.indent;
    return (
        <>
            <DataGrid
                columns={columns}
                rows={list.items}
                isLoading={list.isLoading}
                error={list.error}
                onRetry={list.reload}
                onRowClick={setPanel}
                toolbar={toolbar}
                searchPlaceholder="Search indents"
                empty={empty}
            />

            <IndentPanel indent={panel} side={side} onClose={() => setPanel(null)} />

            <Modal
                open={dialog?.kind === 'ack'}
                onOpenChange={(next) => !next && !busy && setDialog(null)}
                size="sm"
                title={ind ? `Acknowledge ${ind.number}?` : ''}
                description={ind ? `Creates a contract load for ${indentSize(ind)}${ind.loadType === 'PTL' ? '' : ' (one trip each)'} on ${formatDate(ind.pickupDate)}, at ${formatRate(ind.indicativeRatePaise ?? ind.ratePaise, ind.lane?.rateBasis)}.` : ''}
                footer={
                    <ModalFooter
                        summary="The rate is frozen now and cannot change later."
                        secondary={{ label: 'Not yet', onClick: () => setDialog(null), disabled: busy }}
                        primary={{ label: busy ? 'Creating…' : 'Acknowledge', loading: busy, onClick: () => run(() => acknowledgeIndentApi(ind.id), (d) => `${d.number} acknowledged${d.loadNumber ? `. Load ${d.loadNumber} created` : ''}.`) }}
                    />
                }
            >
                {ind?.overVolumeBy > 0 ? <p className="rounded-2xl bg-amber-400/10 px-4 py-3 text-[13px] text-amber-200">This indent is {formatTrucks(ind.overVolumeBy, ind.loadType)} over the contracted monthly volume.</p> : <span />}
            </Modal>

            <ReasonModal
                key={`decline-${ind?.id}`}
                open={dialog?.kind === 'decline'}
                title={ind ? `Decline ${ind.number}?` : ''}
                description="The customer sees your reason and can place another indent."
                confirmLabel="Decline indent"
                destructive
                busy={busy}
                placeholder="For example: no trucks available on that date"
                onCancel={() => setDialog(null)}
                onSubmit={(reason) => run(() => declineIndentApi(ind.id, reason), (d) => `${d.number} declined.`)}
            />
            <ReasonModal
                key={`cancel-${ind?.id}`}
                open={dialog?.kind === 'cancel'}
                title={ind ? `Cancel ${ind.number}?` : ''}
                description="Only possible while the transporter has not answered. The trucks go back to this month's volume."
                confirmLabel="Cancel indent"
                destructive
                busy={busy}
                onCancel={() => setDialog(null)}
                onSubmit={(reason) => run(() => cancelIndentApi(ind.id, reason), (d) => `${d.number} cancelled.`)}
            />
        </>
    );
}
