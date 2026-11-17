'use client';

import { useState } from 'react';
import { XCircle } from 'lucide-react';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { REJECTION_REASON_MAX, REJECTION_REASON_MIN } from '../../constants';

/** Asks for the rejection reason. The parent remounts it (key) each time it opens so the text starts empty. */
export default function RejectModal({ open, companyName, busy, onCancel, onSubmit }) {
    const [reason, setReason] = useState('');
    const trimmed = reason.trim();
    const tooShort = trimmed.length < REJECTION_REASON_MIN;
    const valid = !tooShort && trimmed.length <= REJECTION_REASON_MAX;

    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            icon={<XCircle className="size-5" />}
            tone="danger"
            title={`Reject ${companyName}?`}
            description="The reason goes to the company's admins by email and stays on record. They can fix the problem and apply again."
            footer={
                <ModalFooter
                    danger
                    summary={`${trimmed.length}/${REJECTION_REASON_MAX} characters, emailed to the company's admins`}
                    secondary={{ label: 'Cancel', onClick: onCancel, disabled: busy }}
                    primary={{ label: 'Reject company', onClick: () => onSubmit(trimmed), disabled: !valid, loading: busy }}
                />
            }
        >
            <ModalField label="Reason for rejection" htmlFor="reject-reason" error={reason && tooShort ? `At least ${REJECTION_REASON_MIN} characters` : ''}>
                <textarea
                    id="reject-reason"
                    rows={4}
                    value={reason}
                    maxLength={REJECTION_REASON_MAX}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="For example: the GST certificate is unreadable. Please upload a clear scan."
                    className="w-full resize-y rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-[var(--ds-on-surface)] outline-none placeholder:text-[var(--ds-on-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                />
            </ModalField>
        </Modal>
    );
}
