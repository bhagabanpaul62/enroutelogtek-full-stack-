'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { addTripDocumentApi, apiMessage, transitionTripApi } from '../api/trips.api';
import { DELAY_REASONS, EWAY_BILL_THRESHOLD_PAISE, POD_CONDITIONS, actionLabel } from '../constants';
import { fromLocalInput, toLocalInput } from '../lib/trip';
import { FileField, SelectField, TextArea, TextField } from './fields';

const TITLES = {
    reported: 'Truck reported at pickup',
    loading: 'Start loading',
    loaded: 'Mark loaded',
    in_transit: 'Depart for the drop',
    delayed: 'Report a delay',
    reached_drop: 'Reached the drop',
    delivered: 'Deliver with proof of delivery',
    cancelled: 'Cancel this trip',
};

const needsEway = (trip, load) => Number(load?.declaredValuePaise ?? 0) > EWAY_BILL_THRESHOLD_PAISE && !trip.ewayBillNumber;

/** Checks the fields a move needs; returns { field: message }. Mirrors the 422 rules of POST /trips/:id/transition. */
export function validateTransition(to, f, { trip, load, hasPod }) {
    const e = {};
    if (to === 'loaded') {
        if (!(Number(f.loadedWeightKg) > 0)) e.loadedWeightKg = 'Enter the loaded weight in kg.';
        if (!f.lrNumber.trim()) e.lrNumber = 'Enter the LR number.';
    }
    if (to === 'in_transit' && trip.status !== 'delayed') {
        if (!f.etaAt) e.etaAt = 'Enter the expected arrival time.';
        if (needsEway(trip, load) && !f.ewayBillNumber.trim()) e.ewayBillNumber = 'An e-way bill is needed for goods above ₹50,000.';
    }
    if (to === 'delayed') {
        if (!f.delayReason) e.delayReason = 'Pick a reason.';
        if (!f.etaAt) e.etaAt = 'Enter the new expected arrival time.';
    }
    if (to === 'delivered') {
        if (!f.podCondition) e.podCondition = 'Pick the condition on the LR.';
        if (f.podCondition === 'remarks' && !f.podRemarks.trim()) e.podRemarks = 'Write what the consignee noted.';
        if (!f.podUrl && !hasPod) e.podUrl = 'Add the photo of the signed LR.';
        if (f.receivedByPhone.trim() && !/^\d{10}$/.test(f.receivedByPhone.trim())) e.receivedByPhone = 'Enter a 10 digit mobile number.';
        if (f.receivedByPhone.trim() && !f.receivedBy.trim()) e.receivedBy = 'Enter the name of the person who received the goods.';
        if (f.receivedAt) {
            const at = new Date(f.receivedAt).getTime();
            if (at > Date.now() + 60_000) e.receivedAt = 'The time received cannot be in the future.';
            else if (trip.reachedDropAt && at < Math.floor(new Date(trip.reachedDropAt).getTime() / 60_000) * 60_000) e.receivedAt = 'The time received cannot be before the truck reached the drop.';
        }
    }
    if (to === 'cancelled' && !f.cancelReason.trim()) e.cancelReason = 'Say why the trip is cancelled.';
    return e;
}

function Field({ id, label, hint, required, errors, children }) {
    return (
        <ModalField label={label} htmlFor={id} hint={hint} error={errors[id]} required={required}>
            {children}
        </ModalField>
    );
}

/** One modal for every move on the trip, with only the fields that move needs. */
export default function TransitionModal({ open, onOpenChange, trip, load, to, hasPod, side, onDone }) {
    // The executor cancelling a planned trip does not cancel it: it tells the customer the truck cannot be placed.
    const placementCancel = to === 'cancelled' && trip.status === 'planned' && side === 'executor';
    const [f, setF] = useState(() => ({
        note: '',
        locationText: '',
        loadedWeightKg: trip.loadedWeightKg ?? '',
        lrNumber: trip.lrNumber ?? '',
        ewayBillNumber: trip.ewayBillNumber ?? '',
        ewayBillValidUntil: toLocalInput(trip.ewayBillValidUntil),
        etaAt: toLocalInput(trip.etaAt),
        delayReason: '',
        podCondition: '',
        podRemarks: '',
        podUrl: '',
        receivedBy: '',
        receivedByPhone: '',
        receivedAt: toLocalInput(new Date().toISOString()),
        cancelReason: '',
    }));
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const set = (key) => (event) => setF((s) => ({ ...s, [key]: event.target.value }));

    const submit = async (event) => {
        event?.preventDefault();
        const found = validateTransition(to, f, { trip, load, hasPod });
        setErrors(found);
        if (Object.keys(found).length) return;

        const body = { to };
        if (f.note.trim()) body.note = f.note.trim();
        if (f.locationText.trim()) body.locationText = f.locationText.trim();
        if (to === 'loaded') Object.assign(body, { loadedWeightKg: Number(f.loadedWeightKg), lrNumber: f.lrNumber.trim() });
        if (to === 'in_transit' || to === 'delayed') {
            if (f.etaAt) body.etaAt = fromLocalInput(f.etaAt);
            if (f.ewayBillNumber.trim()) body.ewayBillNumber = f.ewayBillNumber.trim();
            if (f.ewayBillValidUntil) body.ewayBillValidUntil = fromLocalInput(f.ewayBillValidUntil);
        }
        if (to === 'delayed') body.delayReason = f.delayReason;
        if (to === 'delivered') {
            Object.assign(body, { podCondition: f.podCondition, podRemarks: f.podRemarks.trim() || undefined });
            if (f.receivedBy.trim()) body.receivedBy = f.receivedBy.trim();
            if (f.receivedByPhone.trim()) body.receivedByPhone = f.receivedByPhone.trim();
            if (f.receivedAt) body.receivedAt = fromLocalInput(f.receivedAt);
        }
        if (to === 'cancelled') body.cancelReason = f.cancelReason.trim();

        setBusy(true);
        try {
            // The signed LR photo is the POD document; it must exist before the trip can be delivered.
            if (to === 'delivered' && f.podUrl) await addTripDocumentApi(trip.id, { documentType: 'pod', fileUrl: f.podUrl });
            await transitionTripApi(trip.id, body);
            toast.success(placementCancel ? 'The customer has been told. They decide whether to pick another transporter or cancel the load.' : `${TITLES[to] ?? 'Trip updated'}: done`);
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast.error(apiMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const danger = to === 'cancelled';
    const label = placementCancel ? 'Tell the customer' : actionLabel(trip.status, to);
    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            size="md"
            title={placementCancel ? "Can't place the truck" : TITLES[to] ?? label}
            description={
                placementCancel
                    ? 'The trip stays planned. The customer is told and chooses to pick another transporter or cancel the load. This counts as a missed placement on your record.'
                    : trip.status === 'delayed' && to === 'in_transit' ? 'The delay reason stays in the trip history.' : undefined
            }
            tone={danger ? 'danger' : undefined}
            footer={<ModalFooter danger={danger} secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ label, type: 'submit', form: 'trip-transition', loading: busy }} />}
        >
            <form id="trip-transition" onSubmit={submit} className="flex flex-col gap-4" noValidate>
                {to === 'loaded' ? (
                    <>
                        <Field errors={errors} id="loadedWeightKg" label="Loaded weight (kg)" required>
                            <TextField id="loadedWeightKg" type="number" inputMode="decimal" min="0" value={f.loadedWeightKg} onChange={set('loadedWeightKg')} />
                        </Field>
                        <Field errors={errors} id="lrNumber" label="LR number" required>
                            <TextField id="lrNumber" maxLength={40} value={f.lrNumber} onChange={set('lrNumber')} />
                        </Field>
                    </>
                ) : null}

                {to === 'in_transit' || to === 'delayed' ? (
                    <>
                        {to === 'delayed' ? (
                            <Field errors={errors} id="delayReason" label="Reason" required>
                                <SelectField id="delayReason" value={f.delayReason} onChange={set('delayReason')} placeholder="Pick a reason" options={DELAY_REASONS.map((r) => ({ value: r, label: r }))} />
                            </Field>
                        ) : null}
                        {!(to === 'in_transit' && trip.status === 'delayed') ? (
                            <Field errors={errors} id="etaAt" label={to === 'delayed' ? 'New expected arrival' : 'Expected arrival at drop'} required>
                                <TextField id="etaAt" type="datetime-local" value={f.etaAt} onChange={set('etaAt')} />
                            </Field>
                        ) : null}
                        {to === 'in_transit' && trip.status !== 'delayed' ? (
                            <>
                                <Field errors={errors} id="ewayBillNumber" label="E-way bill number" required={needsEway(trip, load)} hint={needsEway(trip, load) ? 'Required: goods are worth over ₹50,000.' : 'Optional below ₹50,000.'}>
                                    <TextField id="ewayBillNumber" maxLength={20} value={f.ewayBillNumber} onChange={set('ewayBillNumber')} />
                                </Field>
                                <Field errors={errors} id="ewayBillValidUntil" label="E-way bill valid until" hint="We warn you 12 hours before it expires.">
                                    <TextField id="ewayBillValidUntil" type="datetime-local" value={f.ewayBillValidUntil} onChange={set('ewayBillValidUntil')} />
                                </Field>
                            </>
                        ) : null}
                    </>
                ) : null}

                {to === 'delivered' ? (
                    <>
                        <Field errors={errors} id="podUrl" label="Signed LR photo (POD)" required={!hasPod} hint={hasPod ? 'A POD is already attached. Add another to replace it.' : 'A clear photo of the LR signed and stamped by the consignee.'}>
                            <FileField documentType="pod" value={f.podUrl} onChange={(url) => setF((s) => ({ ...s, podUrl: url }))} label="Add POD photo" />
                        </Field>
                        <Field errors={errors} id="podCondition" label="Condition on the LR" required>
                            <SelectField id="podCondition" value={f.podCondition} onChange={set('podCondition')} placeholder="Pick one" options={POD_CONDITIONS} />
                        </Field>
                        <Field errors={errors} id="receivedBy" label="Received by" hint="Name of the person who signed for the goods.">
                            <TextField id="receivedBy" maxLength={100} value={f.receivedBy} onChange={set('receivedBy')} autoComplete="off" />
                        </Field>
                        <Field errors={errors} id="receivedByPhone" label="Receiver's mobile number" hint="10 digits.">
                            <TextField id="receivedByPhone" type="tel" inputMode="numeric" maxLength={10} value={f.receivedByPhone} onChange={set('receivedByPhone')} autoComplete="off" />
                        </Field>
                        <Field errors={errors} id="receivedAt" label="Received on" hint="When the goods were handed over. Defaults to now.">
                            <TextField id="receivedAt" type="datetime-local" value={f.receivedAt} onChange={set('receivedAt')} />
                        </Field>
                        {f.podCondition === 'remarks' ? (
                            <Field errors={errors} id="podRemarks" label="What the consignee noted" required>
                                <TextArea id="podRemarks" maxLength={500} value={f.podRemarks} onChange={set('podRemarks')} />
                            </Field>
                        ) : null}
                    </>
                ) : null}

                {to === 'cancelled' ? (
                    <Field errors={errors} id="cancelReason" label="Reason" required hint={placementCancel ? 'The customer sees this when deciding.' : 'Shared with the other side.'}>
                        <TextArea id="cancelReason" maxLength={300} value={f.cancelReason} onChange={set('cancelReason')} />
                    </Field>
                ) : null}

                {['reported', 'loading', 'reached_drop', 'in_transit', 'delayed'].includes(to) ? (
                    <Field errors={errors} id="locationText" label="Where is the truck now" hint="Optional.">
                        <TextField id="locationText" maxLength={200} value={f.locationText} onChange={set('locationText')} />
                    </Field>
                ) : null}

                {to !== 'cancelled' ? (
                    <Field errors={errors} id="note" label="Note" hint="Optional. The customer sees it in the updates.">
                        <TextArea id="note" maxLength={500} value={f.note} onChange={set('note')} className="min-h-[64px]" />
                    </Field>
                ) : null}
            </form>
        </Modal>
    );
}
