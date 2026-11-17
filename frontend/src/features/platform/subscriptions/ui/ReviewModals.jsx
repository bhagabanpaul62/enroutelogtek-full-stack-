'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Modal, ModalField, ModalFooter, formatINR } from '@/shared/ui/kit';
import { PURPOSE_LABELS, REJECT_REASON_MAX, REJECT_REASON_MIN, periodLabel } from '../constants';

const TEXTAREA =
    'w-full resize-y rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-[var(--ds-on-surface)] outline-none placeholder:text-[var(--ds-on-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]';

// The consequence in a fact, shown in the footer.
function consequence(payment) {
    if (payment.purpose === 'extra_seats') return `Adds ${payment.extraSeats} seat${payment.extraSeats === 1 ? '' : 's'} · dates unchanged`;
    const what = payment.purpose === 'renewal' ? 'Extends' : 'Activates';
    const seats = payment.totalSeats ? ` · ${payment.totalSeats} seats` : '';
    return `${what} ${payment.planName} for ${periodLabel(payment.periodMonths)}${seats}`;
}

/** Approve: confirm the amount, optional note. Remounted (key) per open. */
export function ApproveModal({ open, payment, busy, onCancel, onSubmit }) {
    const [note, setNote] = useState('');
    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            size="md"
            icon={<CheckCircle2 className="size-5" />}
            title={`Approve ${formatINR(payment.amountPaise)} from ${payment.companyName}?`}
            description={`${PURPOSE_LABELS[payment.purpose] ?? payment.purpose}. Check that the money reached the bank account first. Approval sets the dates and seats once and cannot be undone.`}
            footer={
                <ModalFooter
                    summary={consequence(payment)}
                    secondary={{ label: 'Cancel', onClick: onCancel, disabled: busy }}
                    primary={{ label: 'Approve payment', onClick: () => onSubmit(note.trim()), loading: busy }}
                />
            }
        >
            <ModalField label="Note (optional)" htmlFor="approve-note" hint="Kept on record, not sent to the company.">
                <textarea id="approve-note" rows={3} value={note} maxLength={REJECT_REASON_MAX} onChange={(e) => setNote(e.target.value)} className={TEXTAREA} />
            </ModalField>
        </Modal>
    );
}

/** Reject: the reason is required and goes to the company. Remounted (key) per open. */
export function RejectPaymentModal({ open, payment, busy, onCancel, onSubmit }) {
    const [reason, setReason] = useState('');
    const trimmed = reason.trim();
    const tooShort = trimmed.length < REJECT_REASON_MIN;
    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            size="md"
            icon={<XCircle className="size-5" />}
            tone="danger"
            title={`Reject the payment from ${payment.companyName}?`}
            description="They see the reason and can submit a new payment. Nothing changes on their plan."
            footer={
                <ModalFooter
                    danger
                    summary={`${trimmed.length}/${REJECT_REASON_MAX} characters, shown to the company`}
                    secondary={{ label: 'Cancel', onClick: onCancel, disabled: busy }}
                    primary={{ label: 'Reject payment', onClick: () => onSubmit(trimmed), disabled: tooShort, loading: busy }}
                />
            }
        >
            <ModalField label="Reason" htmlFor="reject-payment-reason" error={reason && tooShort ? `At least ${REJECT_REASON_MIN} characters` : ''}>
                <textarea
                    id="reject-payment-reason"
                    rows={4}
                    value={reason}
                    maxLength={REJECT_REASON_MAX}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="For example: the amount on the receipt is Rs 4,000 but the plan costs Rs 4,999."
                    className={TEXTAREA}
                />
            </ModalField>
        </Modal>
    );
}
