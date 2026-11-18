'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, ModalFooter } from '@/shared/ui/kit';

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

    const destructive = Boolean(request?.destructive);
    const dialog = (
        <Modal
            open={request !== null}
            // Escape key / outside click = cancel
            onOpenChange={(open) => {
                if (!open) answer(false);
            }}
            size="sm"
            tone={destructive ? 'danger' : undefined}
            icon={destructive ? <AlertTriangle className="size-5" /> : undefined}
            title={request?.title}
            description={request?.description}
            footer={
                <ModalFooter
                    secondary={{ label: 'Cancel', onClick: () => answer(false) }}
                    primary={{ label: request?.confirmLabel ?? 'Confirm', onClick: () => answer(true) }}
                    danger={destructive}
                />
            }
        />
    );

    return [dialog, confirm];
}
