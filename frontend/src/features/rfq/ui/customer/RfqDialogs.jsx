'use client';

import { useState } from 'react';
import { Ban, Clock, Trophy } from 'lucide-react';
import { Modal, ModalField, ModalFooter, Inset, formatINR } from '@/shared/ui/kit';
import { formatDateTime } from '@/shared/lib/format';
import { TextArea, TextInput } from '@/features/loads/ui/customer/steps/FormField';
import { localInputToIso, MS_PER_HOUR } from '@/features/loads/ui/customer/loadTime';
import { toLocalInputValue } from '@/features/loads/lib/format';
import { MAX_WINDOW_DAYS, boardRoute } from '../../lib/rfq';

const REASON_MAX = 300;
const MAX_EXTENSIONS = 3;

/** Cancel an RFQ. The API wants a reason, so the button stays off until there is one. Remount (key) per open. */
export function CancelRfqDialog({ open, rfq, busy, onCancel, onSubmit }) {
    const [reason, setReason] = useState('');
    const trimmed = reason.trim();
    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            size="sm"
            tone="danger"
            icon={<Ban className="size-5" />}
            title={`Cancel ${rfq.number}?`}
            description="Invited transporters are told. You can't cancel once a transporter has accepted a lane."
            footer={
                <ModalFooter
                    danger
                    summary={rfq.status === 'draft' ? 'Nothing has been sent yet' : `${rfq.inviteeCount ?? 0} transporters will be told`}
                    secondary={{ label: 'Keep RFQ', onClick: onCancel, disabled: busy }}
                    primary={{ label: busy ? 'Cancelling…' : 'Cancel RFQ', onClick: () => onSubmit(trimmed), disabled: busy || !trimmed }}
                />
            }
        >
            <ModalField label="Reason" htmlFor="cancel-rfq-reason" required hint={`${trimmed.length}/${REASON_MAX}`}>
                <TextArea id="cancel-rfq-reason" rows={3} maxLength={REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </ModalField>
        </Modal>
    );
}

/** A later close time for an open RFQ. Remount (key) per open. */
export function ExtendRfqDialog({ open, rfq, now, busy, onCancel, onSubmit }) {
    const [value, setValue] = useState(() => toLocalInputValue(new Date(Math.max(now, new Date(rfq.closesAt).getTime()) + 24 * MS_PER_HOUR).toISOString()));
    const iso = localInputToIso(value);
    const at = iso ? new Date(iso).getTime() : NaN;
    const left = Math.max(0, MAX_EXTENSIONS - (rfq.extensionCount ?? 0));
    let problem = '';
    if (!iso) problem = 'Choose a date and time';
    else if (at <= new Date(rfq.closesAt).getTime()) problem = 'Must be later than the current close time';
    else if (at > now + MAX_WINDOW_DAYS * 24 * MS_PER_HOUR) problem = `At most ${MAX_WINDOW_DAYS} days from now`;
    else if (rfq.validTo && at >= new Date(`${String(rfq.validTo).slice(0, 10)}T23:59:59+05:30`).getTime()) problem = 'Must close before the contract period ends';

    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            size="sm"
            icon={<Clock className="size-5" />}
            title="Extend the quote window?"
            description={`Invited transporters are told the new close time. ${left} of ${MAX_EXTENSIONS} extensions left.`}
            footer={
                <ModalFooter
                    summary={iso && !problem ? `Closes ${formatDateTime(iso)}` : `Now closes ${formatDateTime(rfq.closesAt)}`}
                    secondary={{ onClick: onCancel, disabled: busy }}
                    primary={{ label: busy ? 'Saving…' : 'Extend', onClick: () => onSubmit(iso), disabled: busy || Boolean(problem) || left === 0 }}
                />
            }
        >
            <ModalField label="New close time" htmlFor="extend-rfq-closes" error={problem} hint="Indian time (IST)">
                <TextInput id="extend-rfq-closes" type="datetime-local" value={value} invalid={Boolean(problem)} onChange={(e) => setValue(e.target.value)} autoFocus />
            </ModalField>
        </Modal>
    );
}

/**
 * Award the picked lanes. `picks` = [{ lane, quote }]. Lists each lane with its rate, then states
 * the consequence: each transporter gets 24 hours to accept the whole bundle. Remount (key) per open.
 */
export function AwardLanesDialog({ open, picks, busy, onCancel, onSubmit }) {
    const [reason, setReason] = useState('');
    const transporters = new Map();
    for (const { quote } of picks) transporters.set(quote.transporter.id, quote.transporter.name);
    const notLowest = picks.filter(({ quote }) => quote.rank > 1).length;

    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            size="lg"
            icon={<Trophy className="size-5" />}
            title={`Award ${picks.length} ${picks.length === 1 ? 'lane' : 'lanes'}?`}
            description="Each transporter gets 24 hours to accept or decline their lanes together. Accepting creates one contract per transporter."
            footer={
                <ModalFooter
                    summary={`${picks.length} ${picks.length === 1 ? 'lane' : 'lanes'} · ${transporters.size} ${transporters.size === 1 ? 'transporter' : 'transporters'} · 24 h to accept`}
                    secondary={{ label: 'Keep comparing', onClick: onCancel, disabled: busy }}
                    primary={{ label: busy ? 'Awarding…' : 'Award lanes', onClick: () => onSubmit(reason.trim()), disabled: busy }}
                />
            }
        >
            <div className="grid gap-4">
                <ul className="grid gap-2" aria-label="Lanes to award">
                    {picks.map(({ lane, quote }) => (
                        <li key={lane.laneId}>
                            <Inset className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[var(--ds-on-surface)]">{boardRoute(lane)}</p>
                                    <p className="text-xs text-[var(--ds-on-surface-muted)]">{quote.transporter.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium tabular-nums text-[var(--ds-on-surface)]">{formatINR(quote.currentRatePaise)}</p>
                                    <p className="text-xs text-[var(--ds-on-surface-muted)]">{quote.rank === 1 ? 'Lowest quote' : `Quote ranked L${quote.rank}`}</p>
                                </div>
                            </Inset>
                        </li>
                    ))}
                </ul>
                {notLowest > 0 && (
                    <p className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                        {notLowest} {notLowest === 1 ? 'lane is' : 'lanes are'} not awarded to the lowest quote. Add a reason for your records.
                    </p>
                )}
                <ModalField label="Reason" htmlFor="award-rfq-reason" hint={`Optional · ${reason.trim().length}/${REASON_MAX}`}>
                    <TextArea id="award-rfq-reason" rows={2} maxLength={REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: best rate with a fleet already on this corridor." />
                </ModalField>
            </div>
        </Modal>
    );
}
