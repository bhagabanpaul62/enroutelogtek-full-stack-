'use client';

import { Modal, ModalFooter } from '@/shared/ui/kit';

/**
 * One yes/no decision. `summary` says in a fact what the action does ("12 people signed out now").
 * `danger` makes the confirm button destructive.
 */
export default function ConfirmModal({ open, title, description, summary, confirmLabel, danger, busy, icon, onConfirm, onCancel }) {
    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            size="sm"
            icon={icon}
            tone={danger ? 'danger' : undefined}
            title={title}
            description={description}
            footer={
                <ModalFooter
                    summary={summary}
                    danger={danger}
                    secondary={{ label: 'Cancel', onClick: onCancel, disabled: busy }}
                    primary={{ label: confirmLabel, onClick: onConfirm, loading: busy }}
                />
            }
        />
    );
}
