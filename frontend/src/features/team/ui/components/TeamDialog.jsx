'use client';

import { Dialog } from '@base-ui/react/dialog';
import { cn } from '@/shared/lib/utils';

/** Text input look shared by the team forms (matches the loads dialogs). */
export const inputClass =
    'mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none aria-invalid:border-destructive disabled:opacity-60';

/**
 * A form field: label, the control, and one line for the error or the hint.
 * @param {{ id: string, label: string, hint?: string, error?: string, children: React.ReactNode }} props
 */
export function FormField({ id, label, hint, error, children }) {
    return (
        <div>
            <label htmlFor={id} className="block text-[12px] text-[#c6c6c7]">
                {label}
            </label>
            {children}
            <p
                id={`${id}-note`}
                className={cn('mt-1 min-h-4 text-[12px]', error ? 'text-destructive' : 'text-muted-foreground')}
            >
                {error || hint || ''}
            </p>
        </div>
    );
}

/**
 * The frame for every team dialog. Closing (Escape, outside click) is ignored while `busy`.
 * @param {{ open: boolean, title: string, description?: React.ReactNode, busy?: boolean, wide?: boolean, onClose: () => void, children: React.ReactNode }} props
 */
export default function TeamDialog({ open, title, description, busy = false, wide = false, onClose, children }) {
    return (
        <Dialog.Root
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
                {/* text-foreground: the portal renders outside the dashboard layout. */}
                <Dialog.Popup
                    className={cn(
                        'fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-border bg-card p-5 text-foreground shadow-2xl',
                        wide ? 'max-w-xl' : 'max-w-md',
                    )}
                >
                    <Dialog.Title className="text-[15px] font-semibold text-foreground">{title}</Dialog.Title>
                    {description && (
                        <Dialog.Description className="mt-1.5 text-[13px] leading-relaxed text-[#c6c6c7]">
                            {description}
                        </Dialog.Description>
                    )}
                    <div className="mt-4">{children}</div>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
