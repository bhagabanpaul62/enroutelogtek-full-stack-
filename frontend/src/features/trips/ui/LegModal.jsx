'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { apiMessage, recordLegApi } from '../api/trips.api';
import { TextField } from './fields';

export const LEG_META = {
    at_hub: { label: 'Reached a hub', title: 'Reached a hub', description: 'Part-load goods stop at hubs on the way. The customer sees this on the trip.', hub: true },
    out_for_delivery: { label: 'Out for delivery', title: 'Out for delivery', description: 'The goods have left the last hub for the drop.', hub: true },
    unloading: { label: 'Start unloading', title: 'Start unloading', description: 'Marks the time unloading began. Free unloading time and detention count from here.' },
};

/** PTL leg update (hub, last mile) or the unloading start. */
export default function LegModal({ open, onOpenChange, tripId, leg, onDone }) {
    const meta = LEG_META[leg];
    const [hubName, setHubName] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
            await recordLegApi(tripId, { leg, hubName: hubName.trim() || undefined });
            toast.success('Update recorded.');
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast.error(apiMessage(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal open={open} onOpenChange={onOpenChange} size="sm" title={meta.title} description={meta.description}
            footer={<ModalFooter secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ label: 'Record', type: 'submit', form: 'trip-leg', loading: busy }} />}>
            <form id="trip-leg" onSubmit={submit} className="flex flex-col gap-4">
                {meta.hub ? (
                    <ModalField label="Hub or place" htmlFor="leg-hub" hint="Optional.">
                        <TextField id="leg-hub" maxLength={150} value={hubName} onChange={(e) => setHubName(e.target.value)} />
                    </ModalField>
                ) : <p className="text-sm text-[var(--ds-on-surface-variant)]">Record it now?</p>}
            </form>
        </Modal>
    );
}
