'use client';

import { useCallback, useEffect, useState } from 'react';
import { TriangleAlert, Trophy, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { Panel } from '@/shared/ui/kit';
import { apiMessage, getReliabilityApi, getTripApi, getTripsApi, placementDecisionApi } from '@/features/trips/api/trips.api';
import { formatDateTime } from '../../lib/format';
import ReasonDialog from './ReasonDialog';

/**
 * The customer decides what happens to a truck that missed its placement (PRD Q-12): re-award to the
 * next ranked bid, or cancel the truck. The list endpoint has no miss flag, so each planned truck's
 * record is read once; only an open miss (no decision yet) shows a card.
 * `transporterCompanyId` lets the card say how many placements that transporter has missed in all.
 * onDecided() runs after the server accepts the decision (reload the load and its trips).
 */
export default function PlacementMissBanner({ loadId, status, transporterCompanyId, canDecide, onDecided }) {
    const [misses, setMisses] = useState([]); // [{ trip, miss }]
    const [reliability, setReliability] = useState(null);
    const [dialog, setDialog] = useState(null); // { tripId, decision }
    const [busy, setBusy] = useState(false);
    const [tick, setTick] = useState(0);
    const watch = ['accepted', 'in_execution'].includes(status);

    useEffect(() => {
        if (!watch) return undefined;
        let ignore = false;
        getTripsApi({ loadId, role: 'customer', status: 'planned', limit: 50 })
            .then(({ data }) => Promise.all(data.data.map((row) => getTripApi((row.trip ?? row).id).catch(() => null))))
            .then((details) => {
                if (ignore) return;
                setMisses(details.filter((d) => d?.placementMiss && !d.placementMiss.decision).map((d) => ({ trip: d.trip, miss: d.placementMiss })));
            })
            .catch(() => !ignore && setMisses([]));
        return () => {
            ignore = true;
        };
    }, [loadId, watch, status, tick]);

    useEffect(() => {
        if (!misses.length || !transporterCompanyId) return undefined;
        let ignore = false;
        getReliabilityApi(transporterCompanyId)
            .then((r) => !ignore && setReliability(r))
            .catch(() => undefined); // the card still works without the count
        return () => {
            ignore = true;
        };
    }, [misses.length, transporterCompanyId]);

    const decide = useCallback(
        async (reason) => {
            setBusy(true);
            try {
                await placementDecisionApi(dialog.tripId, { decision: dialog.decision, reason: reason || undefined });
                toast.success(dialog.decision === 're_award' ? 'Taken back. Pick the next bid from the Bids tab.' : 'The truck is cancelled.');
                setDialog(null);
                setTick((n) => n + 1);
                onDecided?.();
            } catch (error) {
                toast.error(apiMessage(error));
                setTick((n) => n + 1); // the truck may have reported since: look again
            } finally {
                setBusy(false);
            }
        },
        [dialog, onDecided],
    );

    if (!misses.length) return null;

    return (
        <>
            {misses.map(({ trip, miss }) => (
                <Panel key={trip.id} title={`Truck ${trip.seqNo} did not arrive on time`} action={<TriangleAlert className="size-4 text-amber-300" aria-hidden />}>
                    <div role="alert" className="flex flex-col gap-4">
                        <p className="text-sm text-[var(--ds-on-surface-variant)]">
                            It was expected at pickup{trip.expectedPlacementAt ? ` by ${formatDateTime(trip.expectedPlacementAt)}` : ''} and has not reported. The miss was noted on {formatDateTime(miss.missedAt)}
                            {reliability?.placementMisses ? `, and this transporter has missed ${reliability.placementMisses} ${reliability.placementMisses === 1 ? 'placement' : 'placements'} in all` : ''}.
                            Decide what happens next.
                        </p>
                        {canDecide ? (
                            <div className="flex flex-wrap gap-2">
                                <Button disabled={busy} onClick={() => setDialog({ tripId: trip.id, decision: 're_award' })}>
                                    <Trophy /> Re-award to the next ranked bid
                                </Button>
                                <Button variant="destructive" disabled={busy} onClick={() => setDialog({ tripId: trip.id, decision: 'cancel' })}>
                                    <Ban /> Cancel this truck
                                </Button>
                            </div>
                        ) : (
                            <p className="text-xs text-[var(--ds-on-surface-muted)]">Only admins, co-admins and bid managers can decide. Ask one of them.</p>
                        )}
                        <p className="text-xs text-[var(--ds-on-surface-muted)]">
                            Re-awarding takes back the whole award and reopens the bids; the transporter is told. Cancelling only drops this truck (a one-truck load is cancelled).
                        </p>
                    </div>
                </Panel>
            ))}
            <ReasonDialog
                key={dialog ? `${dialog.tripId}-${dialog.decision}` : 'miss-closed'}
                open={Boolean(dialog)}
                icon={dialog?.decision === 're_award' ? <Trophy className="size-5" /> : <Ban className="size-5" />}
                title={dialog?.decision === 're_award' ? 'Re-award this load?' : 'Cancel this truck?'}
                description={
                    dialog?.decision === 're_award'
                        ? 'The current award is taken back and the miss is recorded against the transporter. You then pick the next ranked bid.'
                        : 'This truck is cancelled with the reason you give. The miss is recorded against the transporter.'
                }
                confirmLabel={dialog?.decision === 're_award' ? 'Take back and re-award' : 'Cancel truck'}
                destructive={dialog?.decision === 'cancel'}
                busy={busy}
                placeholder="For example: the truck did not report by the agreed time."
                onCancel={() => setDialog(null)}
                onSubmit={decide}
            />
        </>
    );
}
