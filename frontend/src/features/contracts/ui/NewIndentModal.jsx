'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Modal, ModalField, ModalFooter, ModalSection } from '@/shared/ui/kit';
import { createIndentApi, getConsumptionApi } from '../api/contract.api';
import { MAX_TRUCKS } from '../constants';
import { errorText, formatDate, formatRate, formatTrucks, laneLabel, monthOf, todayIST } from '../lib/format';
import { Notice, SelectField, TextArea, TextInput } from './fields';

const newKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2)}`);
const EMPTY = { laneId: '', trucks: '1', pickupDate: '', timeFrom: '', timeTo: '', pickupAddress: '', pickupContactName: '', pickupContactPhone: '', dropAddress: '', dropContactName: '', dropContactPhone: '', weightTons: '', notes: '' };

/**
 * Customer places an indent. The parent mounts it with a fresh `key` on every open, so the idempotency
 * key is generated once per open and a double click or retry cannot take capacity twice.
 */
export default function NewIndentModal({ open, contract, onClose, onCreated }) {
    const [idempotencyKey] = useState(newKey);
    const [form, setForm] = useState({ ...EMPTY, laneId: contract.lanes.length === 1 ? contract.lanes[0].id : '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [usage, setUsage] = useState(null); // { month, lane } for the month of the chosen pickup date
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const lane = contract.lanes.find((l) => l.id === form.laneId);
    const month = monthOf(form.pickupDate);
    const trucks = Number(form.trucks);
    const today = todayIST();
    const min = today > contract.validFrom ? today : contract.validFrom;

    // Warn before sending: how full is the pickup month on this lane?
    useEffect(() => {
        if (!open || !form.laneId || month.length !== 7) return undefined;
        let ignore = false;
        getConsumptionApi(contract.id, month)
            .then(({ data }) => !ignore && setUsage({ month, row: data.data.lanes.find((l) => l.contractLaneId === form.laneId) ?? null }))
            .catch(() => !ignore && setUsage(null)); // the server still returns overVolumeBy on create
        return () => {
            ignore = true;
        };
    }, [open, contract.id, form.laneId, month]);

    const warning = useMemo(() => {
        const row = usage?.month === month ? usage.row : null;
        if (!row || !Number.isInteger(trucks) || trucks < 1) return '';
        const used = (row.consumed ?? 0) + (row.requested ?? 0);
        const over = Math.max(0, used + trucks - row.monthlyVolumeTrucks);
        return over > 0 ? `${formatTrucks(used)} of ${row.monthlyVolumeTrucks} are already used or requested for ${formatDate(`${month}-01`).replace(/\s\d+/, '')}. This indent takes the month ${formatTrucks(over)} over. You can still send it.` : '';
    }, [usage, month, trucks]);

    const problems = [];
    if (!form.laneId) problems.push('Pick a lane.');
    if (!Number.isInteger(trucks) || trucks < 1 || trucks > MAX_TRUCKS) problems.push(`Trucks must be 1 to ${MAX_TRUCKS}.`);
    if (!form.pickupDate) problems.push('Pick a pickup date.');
    else if (form.pickupDate < min || form.pickupDate > contract.validTo) problems.push(`Pickup must be between ${formatDate(min)} and ${formatDate(contract.validTo)}.`);

    const submit = async () => {
        if (problems.length || busy) return;
        setBusy(true);
        setError('');
        const text = (v) => v.trim() || undefined;
        try {
            const { data } = await createIndentApi(contract.id, {
                contractLaneId: form.laneId,
                trucks,
                pickupDate: form.pickupDate,
                pickupTimeFrom: text(form.timeFrom),
                pickupTimeTo: text(form.timeTo),
                pickupAddress: text(form.pickupAddress),
                pickupContactName: text(form.pickupContactName),
                pickupContactPhone: text(form.pickupContactPhone),
                dropAddress: text(form.dropAddress),
                dropContactName: text(form.dropContactName),
                dropContactPhone: text(form.dropContactPhone),
                weightTons: form.weightTons ? Number(form.weightTons) : undefined,
                notes: text(form.notes),
                idempotencyKey,
            });
            const indent = data.data;
            toast.success(`${indent.number} sent to ${contract.transporter?.name ?? 'the transporter'}.`);
            if (indent.overVolumeBy > 0) toast.warning(`${formatTrucks(indent.overVolumeBy)} over this month's contracted volume. The indent still stands.`);
            onCreated(indent);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };

    const field = (id, label, props = {}) => (
        <ModalField label={label} htmlFor={id}>
            <TextInput id={id} value={form[props.key ?? id]} onChange={set(props.key ?? id)} {...props.input} />
        </ModalField>
    );

    return (
        <Modal
            open={open}
            onOpenChange={(next) => !next && !busy && onClose()}
            size="lg"
            title="New indent"
            description={`Ask ${contract.transporter?.name ?? 'the transporter'} for trucks on one lane of ${contract.number}.`}
            footer={
                <ModalFooter
                    summary={lane && trucks > 0 ? `${formatTrucks(trucks)} at ${formatRate(lane.currentTerm?.ratePaise, lane.rateBasis)} expected` : 'Pick a lane, a date and the trucks'}
                    secondary={{ onClick: onClose, disabled: busy }}
                    primary={{ label: busy ? 'Sending…' : 'Send indent', loading: busy, disabled: problems.length > 0, onClick: submit }}
                />
            }
        >
            <div className="flex flex-col gap-5">
                {warning ? <Notice>{warning}</Notice> : null}
                {error ? <p role="alert" className="rounded-2xl bg-red-400/10 px-4 py-3 text-[13px] text-red-300">{error}</p> : null}
                <ModalSection title="What you need">
                    <ModalField label="Lane" htmlFor="indent-lane" required>
                        <SelectField id="indent-lane" ariaLabel="Lane" value={form.laneId} onValueChange={(v) => setForm((f) => ({ ...f, laneId: v }))} placeholder="Choose a lane" items={contract.lanes.map((l) => ({ value: l.id, label: laneLabel(l) }))} />
                    </ModalField>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <ModalField label="Trucks" htmlFor="indent-trucks" required hint={`1 to ${MAX_TRUCKS}`}>
                            <TextInput id="indent-trucks" type="number" inputMode="numeric" min={1} max={MAX_TRUCKS} value={form.trucks} onChange={set('trucks')} />
                        </ModalField>
                        <ModalField label="Pickup date" htmlFor="indent-date" required hint={`Within ${formatDate(contract.validFrom)} to ${formatDate(contract.validTo)}`}>
                            <TextInput id="indent-date" type="date" min={min} max={contract.validTo} value={form.pickupDate} onChange={set('pickupDate')} />
                        </ModalField>
                        <ModalField label="Pickup window from" htmlFor="indent-from"><TextInput id="indent-from" type="time" value={form.timeFrom} onChange={set('timeFrom')} /></ModalField>
                        <ModalField label="Pickup window to" htmlFor="indent-to"><TextInput id="indent-to" type="time" value={form.timeTo} onChange={set('timeTo')} /></ModalField>
                    </div>
                </ModalSection>
                <ModalSection title="Pickup and drop" description="Optional. The lane already sets the cities.">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {field('pickupAddress', 'Pickup address', { input: { placeholder: 'Plant, warehouse or street address', maxLength: 300 } })}
                        {field('dropAddress', 'Drop address', { input: { placeholder: 'Plant, warehouse or street address', maxLength: 300 } })}
                        {field('pickupContactName', 'Pickup contact', { input: { maxLength: 100 } })}
                        {field('dropContactName', 'Drop contact', { input: { maxLength: 100 } })}
                        {field('pickupContactPhone', 'Pickup phone', { input: { type: 'tel', inputMode: 'tel', maxLength: 15 } })}
                        {field('dropContactPhone', 'Drop phone', { input: { type: 'tel', inputMode: 'tel', maxLength: 15 } })}
                    </div>
                    {field('weightTons', 'Weight per truck (tons)', { input: { type: 'number', inputMode: 'decimal', min: 0, step: '0.1' } })}
                    <ModalField label="Notes" htmlFor="indent-notes">
                        <TextArea id="indent-notes" rows={2} value={form.notes} onChange={set('notes')} placeholder="Anything the driver or dispatcher should know" />
                    </ModalField>
                </ModalSection>
                {problems.length > 0 && (form.pickupDate || form.laneId) ? <p className="text-xs text-[var(--ds-on-surface-muted)]">{problems[0]}</p> : null}
            </div>
        </Modal>
    );
}
