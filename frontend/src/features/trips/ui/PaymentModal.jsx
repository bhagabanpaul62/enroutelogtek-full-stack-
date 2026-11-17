'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { apiMessage, setPaymentApi } from '../api/trips.api';
import { SelectField, TextField } from './fields';

/** A note only: Enroute does not move money. The transporter sees the note. */
export default function PaymentModal({ open, onOpenChange, tripId, current, onDone }) {
    const [status, setStatus] = useState(current?.status ?? 'paid');
    const [reference, setReference] = useState(current?.reference ?? '');
    const [paidOn, setPaidOn] = useState(current?.paidOn ?? '');
    const [busy, setBusy] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
            await setPaymentApi(tripId, { status, reference: reference.trim() || undefined, paidOn: status === 'paid' && paidOn ? paidOn : undefined });
            toast.success('Payment note saved.');
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast.error(apiMessage(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal open={open} onOpenChange={onOpenChange} size="sm" title="Note the payment"
            description="This is a note for the transporter. Enroute does not collect or move money."
            footer={<ModalFooter secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ label: 'Save note', type: 'submit', form: 'trip-payment', loading: busy }} />}>
            <form id="trip-payment" onSubmit={submit} className="flex flex-col gap-4">
                <ModalField label="Status" htmlFor="pay-status">
                    <SelectField id="pay-status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'paid', label: 'Paid' }, { value: 'unpaid', label: 'Not paid yet' }]} />
                </ModalField>
                {status === 'paid' ? (
                    <ModalField label="Paid on" htmlFor="pay-on" hint="Optional.">
                        <TextField id="pay-on" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
                    </ModalField>
                ) : null}
                <ModalField label="Reference" htmlFor="pay-ref" hint="UTR or cheque number. Optional.">
                    <TextField id="pay-ref" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
                </ModalField>
            </form>
        </Modal>
    );
}
