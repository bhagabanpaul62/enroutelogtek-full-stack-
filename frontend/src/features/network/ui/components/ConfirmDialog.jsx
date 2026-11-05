'use client';

import { useState } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Button } from '@/shared/ui/primitives/button';

/**
 * Ask before a destructive action:
 *   const [confirmDialog, confirm] = useConfirm();
 *   if (await confirm({ title, description, confirmLabel, destructive: true })) { ... }
 *   ...and render {confirmDialog} somewhere in the component.
 */
export function useConfirm() {
    const [request, setRequest] = useState(null);

    const confirm = (options) => new Promise((resolve) => setRequest({ ...options, resolve }));

    const answer = (value) => {
        request?.resolve(value);
        setRequest(null);
    };

    const dialog = (
        <AlertDialog.Root
            open={request !== null}
            onOpenChange={(open) => {
                // Escape key / outside click = cancel
                if (!open) answer(false);
            }}
        >
            <AlertDialog.Portal>
                <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
                {/* text-foreground: the portal renders outside the dashboard layout, so it
                    doesn't inherit the layout's text color. */}
                <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-card p-5 text-foreground shadow-2xl">
                    <AlertDialog.Title className="text-[15px] font-semibold text-foreground">
                        {request?.title}
                    </AlertDialog.Title>
                    <AlertDialog.Description className="mt-2 text-[13px] leading-relaxed text-[#c6c6c7]">
                        {request?.description}
                    </AlertDialog.Description>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => answer(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant={request?.destructive ? 'destructive' : 'default'}
                            onClick={() => answer(true)}
                        >
                            {request?.confirmLabel ?? 'Confirm'}
                        </Button>
                    </div>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );

    return [dialog, confirm];
}
