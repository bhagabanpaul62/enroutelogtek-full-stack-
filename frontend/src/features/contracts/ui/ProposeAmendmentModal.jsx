'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal, ModalField, ModalFooter, ModalSection } from '@/shared/ui/kit';
import { proposeAmendmentApi } from '../api/contract.api';
import { errorText, formatDate, formatTrucks, laneRoute, paiseToRupees, rupeesToPaise, todayIST } from '../lib/format';
import { RATE_UNIT } from '../constants';
import { TextArea, TextInput } from './fields';

/** Either party proposes new rates, volumes, end date or payment terms. Only fields that differ are sent. */
export default function ProposeAmendmentModal({ open, contract, onClose, onProposed }) {
    const today = todayIST();
    const [form, setForm] = useState({
        effectiveFrom: today > contract.validFrom ? today : contract.validFrom,
        validTo: contract.validTo,
        paymentTerms: contract.paymentTerms ?? '',
        note: '',
    });
    const [lanes, setLanes] = useState(() =>
        Object.fromEntries(contract.lanes.map((l) => [l.id, { rate: paiseToRupees(l.currentTerm?.ratePaise), volume: String(l.currentTerm?.monthlyVolumeTrucks ?? '') }])),
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const setLane = (id, key) => (e) => setLanes((s) => ({ ...s, [id]: { ...s[id], [key]: e.target.value } }));

    const laneChanges = contract.lanes.flatMap((l) => {
        const cur = l.currentTerm ?? {};
        const ratePaise = rupeesToPaise(lanes[l.id].rate);
        const vol = lanes[l.id].volume === '' ? null : Number(lanes[l.id].volume);
        const change = { contractLaneId: l.id };
        if (ratePaise !== null && ratePaise !== cur.ratePaise) change.ratePaise = ratePaise;
        if (vol !== null && vol !== cur.monthlyVolumeTrucks) change.monthlyVolumeTrucks = vol;
        return Object.keys(change).length > 1 ? [change] : [];
    });
    const endChanged = form.validTo !== contract.validTo;
    const payChanged = form.paymentTerms.trim() !== (contract.paymentTerms ?? '');

    const problems = [];
    if (!form.effectiveFrom || form.effectiveFrom < today || form.effectiveFrom > contract.validTo) problems.push(`Start date must be between ${formatDate(today)} and ${formatDate(contract.validTo)}.`);
    if (!laneChanges.length && !endChanged && !payChanged) problems.push('Change at least one rate, volume, the end date or the payment terms.');
    if (form.validTo < form.effectiveFrom) problems.push('The new end date cannot be before the start date.');
    for (const c of laneChanges) {
        if (c.ratePaise !== undefined && !(c.ratePaise > 0)) problems.push('Rates must be more than zero.');
        if (c.monthlyVolumeTrucks !== undefined && !(Number.isInteger(c.monthlyVolumeTrucks) && c.monthlyVolumeTrucks >= 1 && c.monthlyVolumeTrucks <= 10000)) problems.push('Monthly volume must be a whole number from 1 to 10,000.');
    }

    const submit = async () => {
        if (problems.length || busy) return;
        setBusy(true);
        setError('');
        try {
            const { data } = await proposeAmendmentApi(contract.id, {
                effectiveFrom: form.effectiveFrom,
                note: form.note.trim() || undefined,
                validTo: endChanged ? form.validTo : undefined,
                paymentTerms: payChanged ? form.paymentTerms.trim() : undefined,
                lanes: laneChanges,
            });
            toast.success('Amendment sent. The contract stays as it is until the other side accepts.');
            onProposed(data.data);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={(next) => !next && !busy && onClose()}
            size="lg"
            title="Propose an amendment"
            description="The other side must accept. Indents already acknowledged keep the rate they were given."
            footer={
                <ModalFooter
                    summary={laneChanges.length ? `${laneChanges.length} ${laneChanges.length === 1 ? 'lane' : 'lanes'} changing` : undefined}
                    secondary={{ onClick: onClose, disabled: busy }}
                    primary={{ label: busy ? 'Sending…' : 'Send proposal', loading: busy, disabled: problems.length > 0, onClick: submit }}
                />
            }
        >
            <div className="flex flex-col gap-5">
                {error ? <p role="alert" className="rounded-2xl bg-red-400/10 px-4 py-3 text-[13px] text-red-300">{error}</p> : null}
                <ModalSection title="When it starts">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <ModalField label="Effective from" htmlFor="amend-from" required hint="Pickups on or after this date use the new terms">
                            <TextInput id="amend-from" type="date" min={today} max={contract.validTo} value={form.effectiveFrom} onChange={set('effectiveFrom')} />
                        </ModalField>
                        <ModalField label="Contract ends" htmlFor="amend-to" hint={`Now ${formatDate(contract.validTo)}`}>
                            <TextInput id="amend-to" type="date" min={form.effectiveFrom} value={form.validTo} onChange={set('validTo')} />
                        </ModalField>
                    </div>
                </ModalSection>
                <ModalSection title="Rates and monthly volume" description="Only lanes you edit are sent. Lanes cannot be added or removed in v1.">
                    <div className="flex flex-col gap-3">
                        {contract.lanes.map((l) => (
                            <div key={l.id} className="rounded-2xl bg-white/[0.04] p-4">
                                <p className="mb-3 text-sm font-medium text-[var(--ds-on-surface)]">Lane {l.laneNo}: {laneRoute(l)}</p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <ModalField label={`Rate (₹ per ${RATE_UNIT[l.rateBasis] ?? 'truck'})`} htmlFor={`amend-rate-${l.id}`}>
                                        <TextInput id={`amend-rate-${l.id}`} type="number" inputMode="decimal" min={0} step="0.01" value={lanes[l.id].rate} onChange={setLane(l.id, 'rate')} />
                                    </ModalField>
                                    <ModalField label={contract.loadType === 'PTL' ? 'Shipments a month' : 'Trucks a month'} htmlFor={`amend-vol-${l.id}`} hint={`Now ${formatTrucks(l.currentTerm?.monthlyVolumeTrucks ?? 0, contract.loadType)}`}>
                                        <TextInput id={`amend-vol-${l.id}`} type="number" inputMode="numeric" min={1} max={10000} value={lanes[l.id].volume} onChange={setLane(l.id, 'volume')} />
                                    </ModalField>
                                </div>
                            </div>
                        ))}
                    </div>
                </ModalSection>
                <ModalSection title="Other">
                    <ModalField label="Payment terms" htmlFor="amend-pay">
                        <TextInput id="amend-pay" maxLength={200} value={form.paymentTerms} onChange={set('paymentTerms')} placeholder="For example: 30 days from POD" />
                    </ModalField>
                    <ModalField label="Note to the other side" htmlFor="amend-note">
                        <TextArea id="amend-note" rows={2} maxLength={300} value={form.note} onChange={set('note')} placeholder="Why the change" />
                    </ModalField>
                </ModalSection>
                {problems.length > 0 ? <p className="text-xs text-[var(--ds-on-surface-muted)]">{problems[0]}</p> : null}
            </div>
        </Modal>
    );
}
