'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { addDiscrepancyApi, apiMessage } from '../api/trips.api';
import { DISCREPANCY_KINDS, DISCREPANCY_UNITS } from '../constants';
import { FileField, SelectField, TextArea, TextField } from './fields';

const MAX_PHOTOS = 4;

/** Raise a shortage or damage on a trip, with photos. Allowed from "reached drop" on, by either side. */
export default function DiscrepancyModal({ open, onOpenChange, tripId, onDone }) {
    const [f, setF] = useState({ kind: 'shortage', quantity: '', unit: 'packages', note: '' });
    const [photos, setPhotos] = useState([]);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const set = (key) => (event) => setF((s) => ({ ...s, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        const e = {};
        if (!(Number(f.quantity) > 0)) e.quantity = 'Enter how much is short or damaged.';
        if (!f.note.trim()) e.note = 'Describe what happened.';
        setErrors(e);
        if (Object.keys(e).length) return;
        setBusy(true);
        try {
            await addDiscrepancyApi(tripId, { kind: f.kind, quantity: Number(f.quantity), unit: f.unit, note: f.note.trim(), photoUrls: photos });
            toast.success('Discrepancy recorded.');
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast.error(apiMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            size="md"
            title="Raise a discrepancy"
            description="Both sides can see it. Settlement happens outside the platform."
            footer={<ModalFooter secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ label: 'Record discrepancy', type: 'submit', form: 'trip-discrepancy', loading: busy }} />}
        >
            <form id="trip-discrepancy" onSubmit={submit} className="flex flex-col gap-4" noValidate>
                <ModalField label="Kind" htmlFor="d-kind" required>
                    <SelectField id="d-kind" value={f.kind} onChange={set('kind')} options={DISCREPANCY_KINDS} />
                </ModalField>
                <div className="grid grid-cols-2 gap-3">
                    <ModalField label="Quantity" htmlFor="d-qty" error={errors.quantity} required>
                        <TextField id="d-qty" type="number" inputMode="decimal" min="0" value={f.quantity} onChange={set('quantity')} />
                    </ModalField>
                    <ModalField label="Unit" htmlFor="d-unit">
                        <SelectField id="d-unit" value={f.unit} onChange={set('unit')} options={DISCREPANCY_UNITS} />
                    </ModalField>
                </div>
                <ModalField label="What happened" htmlFor="d-note" error={errors.note} required>
                    <TextArea id="d-note" maxLength={1000} value={f.note} onChange={set('note')} />
                </ModalField>
                <ModalField label={`Photos (${photos.length} of ${MAX_PHOTOS})`} hint="Optional. Clear photos speed up settlement.">
                    <div className="flex flex-col gap-2">
                        {photos.map((url, i) => (
                            <FileField key={url} value={url} documentType="discrepancy_photo" accept="image/*" onChange={() => setPhotos((p) => p.filter((_, j) => j !== i))} />
                        ))}
                        {photos.length < MAX_PHOTOS ? <FileField key={photos.length} value="" documentType="discrepancy_photo" accept="image/*" label="Add a photo" onChange={(url) => url && setPhotos((p) => [...p, url])} /> : null}
                    </div>
                </ModalField>
            </form>
        </Modal>
    );
}
