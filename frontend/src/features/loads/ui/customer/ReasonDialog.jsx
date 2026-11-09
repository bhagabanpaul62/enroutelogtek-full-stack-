'use client';

import { useState } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Button } from '@/shared/ui/primitives/button';

const REASON_MAX = 300;

/**
 * Confirms an action and takes an optional reason (cancel a load, pick a winner). The parent
 * remounts it (key) each time it opens so the text starts empty.
 * @param {{ open: boolean, title: string, description: import('react').ReactNode, confirmLabel: string,
 *   destructive?: boolean, busy?: boolean, placeholder?: string, onCancel: () => void,
 *   onSubmit: (reason: string) => void }} props
 */
export default function ReasonDialog({
    open,
    title,
    description,
    confirmLabel,
    destructive = false,
    busy = false,
    placeholder,
    onCancel,
    onSubmit,
}) {
    const [reason, setReason] = useState('');
    const trimmed = reason.trim();

    return (
        <AlertDialog.Root
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
        >
            <AlertDialog.Portal>
                <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
                <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-card p-5 text-foreground shadow-2xl">
                    <AlertDialog.Title className="text-[15px] font-semibold text-foreground">{title}</AlertDialog.Title>
                    <AlertDialog.Description className="mt-2 text-[13px] leading-relaxed text-[#c6c6c7]">
                        {description}
                    </AlertDialog.Description>

                    <label htmlFor="reason-dialog-text" className="mt-4 block text-[12px] text-[#c6c6c7]">
                        Reason <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                        id="reason-dialog-text"
                        rows={3}
                        value={reason}
                        maxLength={REASON_MAX}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder={placeholder}
                        className="mt-1.5 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    <div className="mt-1 text-right font-mono text-[11px] text-muted-foreground">
                        {trimmed.length}/{REASON_MAX}
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={onCancel} disabled={busy}>
                            Keep as is
                        </Button>
                        <Button
                            variant={destructive ? 'destructive' : 'default'}
                            disabled={busy}
                            onClick={() => onSubmit(trimmed)}
                        >
                            {busy ? 'Working…' : confirmLabel}
                        </Button>
                    </div>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
