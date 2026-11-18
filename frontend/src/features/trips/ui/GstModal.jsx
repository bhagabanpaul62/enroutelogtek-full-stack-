'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { apiMessage, setGstTreatmentApi } from '../api/trips.api';
import { GST_TREATMENTS } from '../constants';

/** The transporter says how GST applies to this trip's freight. It can be changed until the trip is cancelled; it prints on the closure sheet. */
export default function GstModal({ open, onOpenChange, tripId, current, onDone }) {
    const [value, setValue] = useState(current ?? '');
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState('');

    const submit = async (event) => {
        event.preventDefault();
        if (!value) return;
        setBusy(true);
        setProblem('');
        try {
            await setGstTreatmentApi(tripId, value);
            toast.success('GST treatment saved. It shows on the closure sheet.');
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            setProblem(apiMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            size="md"
            title="GST treatment"
            description="Say how GST applies to your freight on this trip. You can change it later."
            footer={<ModalFooter secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ label: 'Save', type: 'submit', form: 'trip-gst', loading: busy, disabled: !value }} />}
        >
            <form id="trip-gst" onSubmit={submit} className="flex flex-col gap-4">
                <ModalField label="Treatment" required>
                    <div role="radiogroup" aria-label="GST treatment" className="flex flex-col gap-2">
                        {GST_TREATMENTS.map((g) => (
                            <label key={g.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 ${value === g.value ? 'bg-white/[0.1]' : 'bg-white/[0.035]'}`}>
                                <input type="radio" name="gst" value={g.value} checked={value === g.value} onChange={() => setValue(g.value)} className="mt-1" />
                                <span>
                                    <span className="block text-sm font-medium text-[var(--ds-on-surface)]">{g.label}</span>
                                    <span className="block text-xs text-[var(--ds-on-surface-muted)]">{g.detail}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </ModalField>
                {problem ? <p role="alert" className="text-sm text-red-300">{problem}</p> : null}
            </form>
        </Modal>
    );
}
