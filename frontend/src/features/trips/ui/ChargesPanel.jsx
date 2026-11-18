'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, Modal, ModalField, ModalFooter, Panel } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import { apiMessage, decideChargeApi, proposeChargeApi } from '../api/trips.api';
import { CHARGE_KINDS, CHARGE_LABELS } from '../constants';
import { money } from '../lib/trip';
import { SelectField, TextArea, TextField } from './fields';
import TripStatus from './TripStatus';

function ProposeModal({ open, onOpenChange, tripId, onDone }) {
    const [f, setF] = useState({ kind: 'detention', amount: '', description: '' });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const set = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        const e = {};
        if (!(Number(f.amount) > 0)) e.amount = 'Enter an amount above zero.';
        if (!f.description.trim()) e.description = 'Say what the charge is for.';
        setErrors(e);
        if (Object.keys(e).length) return;
        setBusy(true);
        try {
            await proposeChargeApi(tripId, { kind: f.kind, amountPaise: Math.round(Number(f.amount) * 100), description: f.description.trim() });
            toast.success('Charge sent to the customer for approval.');
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
            size="sm"
            title="Propose a charge"
            description="The customer approves or rejects it."
            footer={<ModalFooter secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ label: 'Send for approval', type: 'submit', form: 'trip-charge', loading: busy }} />}
        >
            <form id="trip-charge" onSubmit={submit} className="flex flex-col gap-4" noValidate>
                <ModalField label="Kind" htmlFor="c-kind" required>
                    <SelectField id="c-kind" value={f.kind} onChange={set('kind')} options={CHARGE_KINDS} />
                </ModalField>
                <ModalField label="Amount (₹)" htmlFor="c-amount" error={errors.amount} required>
                    <TextField id="c-amount" type="number" inputMode="decimal" min="0" step="0.01" value={f.amount} onChange={set('amount')} />
                </ModalField>
                <ModalField label="What it is for" htmlFor="c-desc" error={errors.description} required>
                    <TextArea id="c-desc" maxLength={300} value={f.description} onChange={set('description')} className="min-h-[64px]" />
                </ModalField>
            </form>
        </Modal>
    );
}

function RejectModal({ open, onOpenChange, onSubmit }) {
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const run = async () => {
        setBusy(true);
        try {
            await onSubmit(note.trim() || undefined);
            onOpenChange(false);
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal open={open} onOpenChange={onOpenChange} size="sm" title="Reject this charge" tone="danger" description="The transporter sees your note."
            footer={<ModalFooter danger secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ label: 'Reject', onClick: run, loading: busy }} />}>
            <ModalField label="Note" htmlFor="c-reject" hint="Optional.">
                <TextArea id="c-reject" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            </ModalField>
        </Modal>
    );
}

/** Freight (agreed) plus extras. The executor proposes; the customer approves or rejects. */
export default function ChargesPanel({ trip, charges, side, can, onChanged }) {
    const [propose, setPropose] = useState(false);
    const [rejecting, setRejecting] = useState(null);
    const closed = trip.status === 'cancelled';
    const canPropose = side === 'executor' && can('trips.update') && !closed;
    const canDecide = side === 'customer' && can('loads.manage');
    const total = (charges ?? []).filter((c) => c.status === 'approved').reduce((sum, c) => sum + Number(c.amountPaise), 0);

    const decide = async (charge, decision, note) => {
        try {
            await decideChargeApi(trip.id, charge.id, { decision, note });
            toast.success(decision === 'approved' ? 'Charge approved.' : 'Charge rejected.');
            onChanged?.();
        } catch (error) {
            toast.error(apiMessage(error));
        }
    };

    return (
        <Panel
            title="Charges"
            action={canPropose ? (
                <Button type="button" variant="secondary" className="h-9 rounded-xl px-3 text-sm" onClick={() => setPropose(true)}>
                    <Plus className="mr-1.5 size-4" aria-hidden /> Propose a charge
                </Button>
            ) : null}
        >
            {charges?.length ? (
                <>
                    <ul className="flex flex-col">
                        {charges.map((c) => (
                            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-2 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-[var(--ds-on-surface)]">{CHARGE_LABELS[c.kind] ?? c.kind}</p>
                                    {c.description ? <p className="truncate text-xs text-[var(--ds-on-surface-muted)]">{c.description}</p> : null}
                                    {c.decisionNote ? <p className="truncate text-xs text-[var(--ds-on-surface-muted)]">Note: {c.decisionNote}</p> : null}
                                </div>
                                <TripStatus value={c.status} />
                                <span className="w-24 text-right text-sm tabular-nums text-[var(--ds-on-surface)]">{money(c.amountPaise)}</span>
                                {canDecide && c.status === 'proposed' ? (
                                    <span className="flex gap-2">
                                        <Button type="button" className="h-8 rounded-lg px-3 text-xs" onClick={() => decide(c, 'approved')} aria-label={`Approve ${CHARGE_LABELS[c.kind]} charge`}>Approve</Button>
                                        <Button type="button" variant="secondary" className="h-8 rounded-lg px-3 text-xs" onClick={() => setRejecting(c)} aria-label={`Reject ${CHARGE_LABELS[c.kind]} charge`}>Reject</Button>
                                    </span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/[0.035] px-4 py-3">
                        <span className="text-sm text-[var(--ds-on-surface-muted)]">Approved total</span>
                        <span className="text-lg font-medium tabular-nums text-[var(--ds-on-surface)]">{money(total)}</span>
                    </div>
                </>
            ) : (
                <EmptyState title="No charges yet" description="Freight appears when the trip is created. Detention, labour and toll are added here." />
            )}
            {propose ? <ProposeModal open onOpenChange={setPropose} tripId={trip.id} onDone={onChanged} /> : null}
            {rejecting ? <RejectModal open onOpenChange={(o) => !o && setRejecting(null)} onSubmit={(note) => decide(rejecting, 'rejected', note)} /> : null}
        </Panel>
    );
}
