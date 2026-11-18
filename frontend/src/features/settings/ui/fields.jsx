'use client';

import { Modal, ModalFooter } from '@/shared/ui/kit';

/** Text input in the kit look: tonal fill, no border. */
export const inputClass =
    'h-10 w-full rounded-xl bg-white/[0.06] px-3 text-sm text-[var(--ds-on-surface)] placeholder:text-[var(--ds-on-surface-muted)] outline-none focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)] aria-invalid:outline-2 aria-invalid:outline-red-400 disabled:opacity-60';

/** A modal with a form inside: Cancel + one primary that submits form `form`. Closing is ignored while busy. */
export function FormModal({ open, onClose, busy, title, description, icon, size = 'md', form, primaryLabel, primaryDisabled, summary, children }) {
    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onClose();
            }}
            size={size}
            icon={icon}
            title={title}
            description={description}
            footer={
                <ModalFooter
                    summary={summary}
                    secondary={{ label: 'Cancel', onClick: onClose, disabled: busy }}
                    primary={{ type: 'submit', form, label: primaryLabel, loading: busy, disabled: primaryDisabled }}
                />
            }
        >
            {children}
        </Modal>
    );
}
