'use client';

import { useCallback, useEffect, useState } from 'react';
import { billingApi } from '../api/billing.api';
import { BILLING_CHANGED } from './constants';

/** The company's subscription status; refetches whenever any billing view says it changed. `enabled` false skips the call. */
export function useBillingStatus(enabled = true) {
    const [result, setResult] = useState({ status: null, error: '', loaded: false });
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!enabled) return undefined;
        let ignore = false;
        billingApi
            .getStatus()
            .then(({ data }) => !ignore && setResult({ status: data.data, error: '', loaded: true }))
            .catch(
                (e) =>
                    !ignore &&
                    setResult((prev) => ({
                        status: prev.status,
                        error: e.response?.data?.message || 'Could not load your plan.',
                        loaded: true,
                    })),
            );
        return () => {
            ignore = true;
        };
    }, [enabled, count]);

    const reload = useCallback(() => setCount((n) => n + 1), []);
    useEffect(() => {
        if (!enabled) return undefined;
        window.addEventListener(BILLING_CHANGED, reload);
        return () => window.removeEventListener(BILLING_CHANGED, reload);
    }, [enabled, reload]);

    return { ...result, isLoading: enabled && !result.loaded, reload };
}
