'use client';

import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Runs one decision (approve, reject, block, unblock) and tells the admin how it went.
 * A decision that stuck but whose email failed is a warning, not an error: the company's
 * status changed, the admin just has to tell them another way.
 * Resolves with the API payload, or null when the call failed.
 */
export function useCompanyDecision() {
    const [busy, setBusy] = useState(false);

    const run = async (action) => {
        setBusy(true);
        try {
            const { data } = await action();
            if (data.data?.emailSent === false) {
                toast.warning(data.message);
            } else {
                toast.success(data.message);
            }
            return data.data;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
            return null;
        } finally {
            setBusy(false);
        }
    };

    return { run, busy };
}
