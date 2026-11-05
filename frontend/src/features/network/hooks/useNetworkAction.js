'use client';

import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Runs one action (accept, block, ...) for a row: marks that row busy and shows a toast.
 * Returns:
 *   'ok'    - it worked, update the list
 *   'stale' - the row changed on the server (e.g. the other company cancelled) - reload the list
 *   'error' - anything else (the toast already told the user)
 */
export function useNetworkAction() {
    const [busyIds, setBusyIds] = useState(() => new Set());

    const run = async (id, action, successMessage) => {
        setBusyIds((prev) => new Set(prev).add(id));
        try {
            await action();
            toast.success(successMessage);
            return 'ok';
        } catch (error) {
            const status = error.response?.status;
            toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
            return status === 404 || status === 409 ? 'stale' : 'error';
        } finally {
            setBusyIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    return { run, isBusy: (id) => busyIds.has(id) };
}
