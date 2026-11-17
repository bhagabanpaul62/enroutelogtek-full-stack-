import { formatDateTime } from './trip';

/** Latest payment note from the event history: { status, reference, paidOn, at } or null. */
export const paymentNote = (events = []) => {
    const e = [...events].reverse().find((x) => x.type === 'payment');
    return e ? { status: e.data?.status ?? e.note, reference: e.data?.reference ?? '', paidOn: e.data?.paidOn ?? '', at: e.createdAt } : null;
};

/** The customer's last POD rejection that is still open (trip back at the drop, not delivered since). */
export const openPodRejection = (trip, events = []) => {
    if (trip.status !== 'reached_drop') return null;
    const e = [...events].reverse().find((x) => x.type === 'pod_rejected');
    return e ?? null;
};

/**
 * One plain sentence per status and side: what is happening and who acts next. Never empty for a live status,
 * so no trip screen is a dead end. ctx: { canUpdate, canAward, canManage, hasVehicle, rejection, missed }.
 */
export function nextStep(trip, side, ctx) {
    const s = trip.status;
    const exec = side === 'executor';
    const noRight = exec && !ctx.canUpdate ? ' You need the trips.update permission to do this; ask your admin.' : '';
    if (s === 'completed') return exec ? 'Trip completed. You can rate the customer, and see the payment note below once the customer adds it.' : 'Trip completed. You can rate the transporter and note the payment.';
    if (s === 'cancelled') return `Trip cancelled${trip.cancelReason ? `: ${trip.cancelReason}` : ''}. Nothing more to do on it.`;
    if (s === 'planned') {
        if (exec) return ctx.hasVehicle ? `Truck and driver are set. Mark it reported when it reaches the pickup.${noRight}` : `Assign a vehicle and driver, then mark it reported at pickup.${noRight}`;
        return trip.vehicleId ? 'The transporter has assigned a truck and will report it at pickup.' : 'Waiting for the transporter to assign a truck and driver. You can cancel this truck while it is planned.';
    }
    if (s === 'reported') return exec ? `Truck is at pickup. Start loading when ready.${noRight}` : 'The truck is at the pickup. Loading starts next.';
    if (s === 'loading') return exec ? `Finish loading, then mark it loaded with the LR number and weight.${noRight}` : 'Loading is under way.';
    if (s === 'loaded') return exec ? `Depart when ready. You need the expected arrival time (and an e-way bill for goods above Rs 50,000).${noRight}` : 'Loaded. The truck departs next.';
    if (s === 'in_transit') return exec ? `Add updates on the way. Report a delay if the ETA slips, or mark reached drop on arrival.${noRight}` : `On the way${trip.etaAt ? `, expected ${formatDateTime(trip.etaAt)}` : ''}.`;
    if (s === 'delayed') return exec ? `Resume transit once moving, or mark reached drop on arrival.${noRight}` : 'The truck is delayed. The transporter will update the ETA.';
    if (s === 'reached_drop') {
        if (ctx.rejection) return exec ? `Re-upload the signed LR and mark delivered again.${noRight}` : 'Waiting for the transporter to upload a new POD.';
        return exec ? `Upload the photo of the signed LR and mark delivered.${noRight}` : 'The truck is at the drop. The transporter will upload the POD.';
    }
    if (s === 'delivered') {
        const by = trip.autoCompleteAt ? ` by ${formatDateTime(trip.autoCompleteAt)}` : '';
        return exec ? `Waiting for the customer to confirm or reject the POD. It completes by itself${by}.` : `Check the POD. Confirm it, reject it, or raise a discrepancy${by}; after that it completes on its own.${ctx.canAward ? '' : ' Confirming needs the loads.award permission.'}`;
    }
    return '';
}
