'use client';

import { useState } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Button } from '@/shared/ui/primitives/button';
import { REJECTION_REASON_MAX, REJECTION_REASON_MIN } from '../../constants';

/**
 * Asks for the rejection reason. The parent remounts it (key) each time it opens so the
 * text starts empty.
 */
export default function RejectDialog({ open, companyName, busy, onCancel, onSubmit }) {
    const [reason, setReason] = useState('');
    const trimmed = reason.trim();
    const tooShort = trimmed.length < REJECTION_REASON_MIN;
    const valid = !tooShort && trimmed.length <= REJECTION_REASON_MAX;

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
                    <AlertDialog.Title className="text-[15px] font-semibold text-foreground">
                        Reject {companyName}?
                    </AlertDialog.Title>
                    <AlertDialog.Description className="mt-2 text-[13px] leading-relaxed text-[#c6c6c7]">
                        The reason goes to the company&apos;s admins by email and stays on record.
                        They can fix the problem and apply again.
                    </AlertDialog.Description>

                    <label htmlFor="reject-reason" className="sr-only">
                        Reason for rejection
                    </label>
                    <textarea
                        id="reject-reason"
                        rows={4}
                        value={reason}
                        maxLength={REJECTION_REASON_MAX}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="For example: the GST certificate is unreadable. Please upload a clear scan."
                        className="mt-4 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
                        <span>{tooShort ? `At least ${REJECTION_REASON_MIN} characters` : ''}</span>
                        <span>
                            {trimmed.length}/{REJECTION_REASON_MAX}
                        </span>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="outline" onClick={onCancel} disabled={busy}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={!valid || busy}
                            onClick={() => onSubmit(trimmed)}
                        >
                            {busy ? 'Rejecting…' : 'Reject company'}
                        </Button>
                    </div>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
