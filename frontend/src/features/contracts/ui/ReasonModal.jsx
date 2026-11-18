'use client';

import { useState } from 'react';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { TextArea } from './fields';

const MAX = 300;

/** Confirm + a reason. The parent remounts it (key) on every open so the text starts empty. */
export default function ReasonModal({ open, title, description, confirmLabel, required = true, destructive = false, busy = false, label = 'Reason', placeholder, icon, children, onCancel, onSubmit }) {
    const [reason, setReason] = useState('');
    const text = reason.trim();
    return (
        <Modal
            open={open}
            onOpenChange={(next) => !next && !busy && onCancel()}
            size="sm"
            title={title}
            description={description}
            icon={icon}
            tone={destructive ? 'danger' : undefined}
            footer={
                <ModalFooter
                    danger={destructive}
                    secondary={{ label: 'Keep as is', onClick: onCancel, disabled: busy }}
                    primary={{ label: busy ? 'Working…' : confirmLabel, onClick: () => onSubmit(text), disabled: busy || (required && !text) }}
                />
            }
        >
            <div className="flex flex-col gap-4">
                {children}
                <ModalField label={label} htmlFor="contract-reason" required={required} hint={`${required ? 'Required' : 'Optional'} · ${text.length}/${MAX}`}>
                    <TextArea id="contract-reason" rows={3} maxLength={MAX} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} autoFocus />
                </ModalField>
            </div>
        </Modal>
    );
}
