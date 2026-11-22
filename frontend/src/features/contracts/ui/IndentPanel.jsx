'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Fact, FactList, SidePanel, StatusChip, Timeline, formatDateTime } from '@/shared/ui/kit';
import { SIDES } from '../constants';
import { formatDate, formatRate, formatTrucks, indentSize, laneRoute } from '../lib/format';
import { Notice } from './fields';

const when = (iso) => (iso ? formatDateTime(iso) : undefined);

function steps(indent) {
    const out = [{ key: 'requested', label: 'Requested', state: 'done', time: when(indent.createdAt) }];
    if (indent.status === 'declined') out.push({ key: 'declined', label: 'Declined', state: 'done', time: when(indent.respondedAt), note: indent.declineReason });
    else if (indent.status === 'cancelled') out.push({ key: 'cancelled', label: 'Cancelled', state: 'done', time: when(indent.respondedAt), note: indent.cancelReason });
    else {
        const acked = indent.status === 'acknowledged' || indent.status === 'fulfilled';
        out.push({ key: 'acknowledged', label: 'Acknowledged, load created', state: acked ? 'done' : 'current', time: when(indent.respondedAt) });
        out.push({ key: 'fulfilled', label: 'Fulfilled', state: indent.status === 'fulfilled' ? 'done' : acked ? 'current' : 'upcoming', time: when(indent.fulfilledAt) });
    }
    return out;
}

/** One indent in a side panel: facts, status timeline, the frozen rate, and the link to its load where trips run. */
export default function IndentPanel({ indent, side, onClose }) {
    const lane = indent?.lane;
    const rate = indent?.ratePaise ?? indent?.indicativeRatePaise;
    return (
        <SidePanel
            open={Boolean(indent)}
            onOpenChange={(next) => !next && onClose()}
            size="md"
            title={indent ? indent.number : ''}
            description={indent ? `${indent.contractNumber} · ${laneRoute(lane)}` : ''}
            headerTrailing={indent ? <StatusChip value={indent.status} /> : null}
        >
            {indent ? (
                <div className="flex flex-col gap-6">
                    {indent.overVolumeBy > 0 ? (
                        <Notice>This indent takes the month {formatTrucks(indent.overVolumeBy, indent.loadType)} over the contracted volume. It is still valid; there is no penalty in v1.</Notice>
                    ) : null}
                    {indent.loadId ? (
                        <Link
                            href={SIDES[side].load(indent.loadId)}
                            className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                        >
                            <span>Open load {indent.loadNumber} and its trips</span>
                            <ExternalLink className="size-4" aria-hidden />
                        </Link>
                    ) : null}
                    <FactList>
                        <Fact label="Lane">{laneRoute(lane)}{lane?.vehicleType?.name ? ` · ${lane.vehicleType.name}` : ''}</Fact>
                        <Fact label={indent.loadType === 'PTL' ? 'Shipment' : 'Trucks'}>{indentSize(indent)}</Fact>
                        {indent.loadType === 'PTL' ? <Fact label="Actual weight">{`${indent.actualWeightKg} kg`}</Fact> : null}
                        {indent.loadType === 'PTL' ? <Fact label="Packages">{(indent.packageDims ?? []).map((p) => `${p.count} × ${p.lengthCm}×${p.widthCm}×${p.heightCm} cm`).join(', ')}</Fact> : null}
                        <Fact label="Pickup">{formatDate(indent.pickupDate)}{indent.pickupTimeFrom ? `, ${indent.pickupTimeFrom}${indent.pickupTimeTo ? ` to ${indent.pickupTimeTo}` : ''}` : ''}</Fact>
                        <Fact label={indent.ratePaise != null ? 'Rate (frozen)' : 'Rate (expected)'}>{rate != null ? formatRate(rate, lane?.rateBasis) : null}</Fact>
                        {indent.ratePaise == null && rate != null ? <Fact label="Note"><span className="text-[var(--ds-on-surface-muted)]">Final rate is fixed when the transporter acknowledges, using the contract version in force on the pickup date.</span></Fact> : null}
                        <Fact label="Pickup address">{indent.pickupAddress}</Fact>
                        <Fact label="Pickup contact">{[indent.pickupContactName, indent.pickupContactPhone].filter(Boolean).join(', ')}</Fact>
                        <Fact label="Drop address">{indent.dropAddress}</Fact>
                        <Fact label="Drop contact">{[indent.dropContactName, indent.dropContactPhone].filter(Boolean).join(', ')}</Fact>
                        <Fact label="Weight">{indent.weightTons ? `${indent.weightTons} t` : null}</Fact>
                        <Fact label="Notes">{indent.notes}</Fact>
                        <Fact label="Customer">{indent.customer?.name}</Fact>
                        <Fact label="Transporter">{indent.transporter?.name}</Fact>
                    </FactList>
                    <div>
                        <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">Progress</h3>
                        <Timeline steps={steps(indent)} />
                    </div>
                </div>
            ) : null}
        </SidePanel>
    );
}
