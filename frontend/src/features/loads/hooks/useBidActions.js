'use client';

import { useState } from 'react';
import { toast } from 'sonner';

const FALLBACK = 'Something went wrong. Please try again.';

/**
 * Runs one transporter action (place a bid, accept or decline an award, assign a truck) and
 * tells the user how it went: a success toast with the server's message, or an error toast.
 * Statuses listed in `quietStatuses` get no toast so the caller can show the message itself
 * (for example a validation message under a form).
 * @param {() => void} [onSuccess] called after a successful action, typically to refetch the load
 * @returns {{
 *   run: (action: () => Promise<object>, options?: { quietStatuses?: number[] }) =>
 *     Promise<{ ok: boolean, data?: object, message: string, status?: number, fields?: Record<string, string> }>,
 *   busy: boolean
 * }}
 */
export function useBidActions(onSuccess) {
    const [busy, setBusy] = useState(false);

    const run = async (action, { quietStatuses = [] } = {}) => {
        setBusy(true);
        try {
            const { data } = await action();
            toast.success(data.message);
            onSuccess?.();
            return { ok: true, data: data.data, message: data.message };
        } catch (error) {
            const status = error.response?.status;
            const message = error.response?.data?.message || FALLBACK;
            if (!quietStatuses.includes(status)) toast.error(message);
            return { ok: false, status, message, fields: error.response?.data?.error };
        } finally {
            setBusy(false);
        }
    };

    return { run, busy };
}
