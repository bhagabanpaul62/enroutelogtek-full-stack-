'use client';

import { useState } from 'react';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { TextArea } from './steps/FormField';

const REASON_MAX = 300;

/**
 * Confirms an action and takes an optional reason (cancel a load, pick a winner). The parent
 * remounts it (key) each time it opens so the text starts empty.
 * `summary` is the fact shown at the left of the footer; `icon` the header chip.
 * @param {{ open: boolean, title: string, description: import('react').ReactNode, confirmLabel: string,
 *   destructive?: boolean, busy?: boolean, placeholder?: string, summary?: import('react').ReactNode,
 *   icon?: import('react').ReactNode, onCancel: () => void, onSubmit: (reason: string) => void }} props
 */
export default function ReasonDialog({
    open,
    title,
    description,
    confirmLabel,
    destructive = false,
    busy = false,
    placeholder,
    summary,
    icon,
    onCancel,
    onSubmit,
}) {
    const [reason, setReason] = useState('');
    const trimmed = reason.trim();

    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            size="sm"
            title={title}
            description={description}
            icon={icon}
            tone={destructive ? 'danger' : undefined}
            footer={
                <ModalFooter
                    summary={summary}
                    danger={destructive}
                    secondary={{ label: 'Keep as is', onClick: onCancel, disabled: busy }}
                    primary={{ label: busy ? 'Working…' : confirmLabel, onClick: () => onSubmit(trimmed), disabled: busy }}
                />
            }
        >
            <ModalField label="Reason" htmlFor="reason-dialog-text" hint={`Optional · ${trimmed.length}/${REASON_MAX}`}>
                <TextArea
                    id="reason-dialog-text"
                    rows={3}
                    value={reason}
                    maxLength={REASON_MAX}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={placeholder}
                    autoFocus
                />
            </ModalField>
        </Modal>
    );
}
