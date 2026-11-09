'use client';

import { useEffect, useState } from 'react';
import { getLoadApi } from '../../api/loads.api';

const POLL_MS = 30 * 1000;
// Bids and award answers change while these are on; the page refreshes itself.
const POLLED_STATUSES = ['live', 'awarded'];

const errorMessage = (error) =>
    error.response?.status === 404
        ? 'This load does not exist or belongs to another company.'
        : error.response?.data?.message || 'Could not load this load. Please try again.';

/**
 * One customer load for its detail page. Refetches every 30 s while bidding is open or an
 * award is waiting for an answer; replaceLoad() takes the load an action returned.
 * @param {string} loadId
 */
export function useLoadDetail(loadId) {
    const [state, setState] = useState({ load: null, error: '', loadedId: null });
    const [reloadCount, setReloadCount] = useState(0);
    const [refreshError, setRefreshError] = useState('');

    useEffect(() => {
        let ignore = false;
        getLoadApi(loadId)
            .then(({ data }) => {
                if (!ignore) setState({ load: data.data, error: '', loadedId: loadId });
            })
            .catch((error) => {
                if (!ignore) setState({ load: null, error: errorMessage(error), loadedId: loadId });
            });
        return () => {
            ignore = true;
        };
    }, [loadId, reloadCount]);

    const isCurrent = state.loadedId === loadId;
    const load = isCurrent ? state.load : null;
    const shouldPoll = Boolean(load) && POLLED_STATUSES.includes(load.status);

    useEffect(() => {
        if (!shouldPoll) return undefined;
        const timer = setInterval(() => {
            getLoadApi(loadId)
                .then(({ data }) => {
                    setState({ load: data.data, error: '', loadedId: loadId });
                    setRefreshError('');
                })
                .catch(() => {
                    // The page keeps what it has; the next tick tries again.
                    setRefreshError('Could not refresh the bids. Trying again shortly.');
                });
        }, POLL_MS);
        return () => clearInterval(timer);
    }, [loadId, shouldPoll]);

    return {
        load,
        error: isCurrent ? state.error : '',
        isLoading: !isCurrent,
        refreshError,
        reload: () => setReloadCount((count) => count + 1),
        replaceLoad: (next) => setState({ load: next, error: '', loadedId: next.id }),
    };
}
