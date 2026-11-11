'use client';

import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Runs one team action (save, deactivate, ...) and reports it with a toast. `busy` is true while
 * any action runs, so buttons can refuse a second click.
 * @returns {{ run: (action: () => Promise<any>, successMessage: string) => Promise<any|null>, busy: boolean }}
 *   run resolves with the API's data on success and null on failure (the toast already said why)
 */
export function useTeamAction() {
    const [busy, setBusy] = useState(false);

    const run = async (action, successMessage) => {
        setBusy(true);
        try {
            const response = await action();
            toast.success(successMessage);
            return response?.data?.data ?? true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
            return null;
        } finally {
            setBusy(false);
        }
    };

    return { run, busy };
}
