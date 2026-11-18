'use client';

import { useEffect, useState } from 'react';
import { getRfqApi } from '../api/rfq.api';

const POLL_MS = 30 * 1000;
// Quotes, awards and answers change while an RFQ is in these states; the page refreshes itself.
const POLLED = ['open', 'closed', 'awarded'];

const errorMessage = (error) =>
    error.response?.status === 404
        ? 'This RFQ does not exist or is not shared with your company.'
        : error.response?.data?.message || 'Could not load this RFQ. Please try again.';

/** One RFQ for its record page, either side. replaceRfq() takes what an action returned. */
export function useRfq(rfqId) {
    const [state, setState] = useState({ rfq: null, error: '', loadedId: null });
    const [reloadCount, setReloadCount] = useState(0);
    const [refreshError, setRefreshError] = useState('');

    useEffect(() => {
        let ignore = false;
        getRfqApi(rfqId)
            .then(({ data }) => {
                if (!ignore) setState({ rfq: data.data, error: '', loadedId: rfqId });
            })
            .catch((error) => {
                if (!ignore) setState({ rfq: null, error: errorMessage(error), loadedId: rfqId });
            });
        return () => {
            ignore = true;
        };
    }, [rfqId, reloadCount]);

    const isCurrent = state.loadedId === rfqId;
    const rfq = isCurrent ? state.rfq : null;
    const shouldPoll = Boolean(rfq) && POLLED.includes(rfq.status);

    useEffect(() => {
        if (!shouldPoll) return undefined;
        const timer = setInterval(() => {
            getRfqApi(rfqId)
                .then(({ data }) => {
                    setState({ rfq: data.data, error: '', loadedId: rfqId });
                    setRefreshError('');
                })
                .catch(() => setRefreshError('Could not refresh. Trying again shortly.'));
        }, POLL_MS);
        return () => clearInterval(timer);
    }, [rfqId, shouldPoll]);

    return {
        rfq,
        error: isCurrent ? state.error : '',
        isLoading: !isCurrent,
        refreshError,
        reload: () => setReloadCount((n) => n + 1),
        replaceRfq: (next) => setState({ rfq: next, error: '', loadedId: next.id }),
    };
}
