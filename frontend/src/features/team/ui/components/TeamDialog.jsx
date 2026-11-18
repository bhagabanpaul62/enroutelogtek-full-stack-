'use client';

import { Modal, ModalFooter } from '@/shared/ui/kit';

/** Text input look shared by the team forms (same as the grid's search box, one step taller). */
export const inputClass =
    'h-10 w-full rounded-xl border-0 bg-white/[0.05] px-3 text-sm text-foreground outline-none placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-primary/40 aria-invalid:ring-2 aria-invalid:ring-red-400/50 disabled:opacity-60';

/**
 * The frame for every team dialog: a kit Modal with Cancel + one primary in the footer.
 * Closing (Escape, outside click, Cancel) is ignored while `busy`.
 * `form` is the id of the <form> in `children`; the primary button submits it.
 * Omit `primary` for a dialog that only has a Done button (pass `done`).
 * @param {{ open: boolean, title: string, description?: React.ReactNode, icon?: React.ReactNode, size?: string, busy?: boolean, form?: string, primary?: { label: string, disabled?: boolean }, summary?: React.ReactNode, done?: { label: string, onClick: () => void }, extra?: React.ReactNode, onClose: () => void, children: React.ReactNode }} props
 */
export default function TeamDialog({ open, title, description, icon, size = 'md', busy = false, form, primary, summary, done, extra, onClose, children }) {
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
                    extra={extra}
                    secondary={done ? undefined : { label: 'Cancel', onClick: onClose, disabled: busy }}
                    primary={
                        done
                            ? { label: done.label, onClick: done.onClick }
                            : primary && { type: 'submit', form, label: primary.label, loading: busy, disabled: primary.disabled }
                    }
                />
            }
        >
            {children}
        </Modal>
    );
}
