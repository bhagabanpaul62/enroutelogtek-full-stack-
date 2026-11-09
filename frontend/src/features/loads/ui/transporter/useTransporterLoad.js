'use client';

import { useEffect, useState } from 'react';
import { getLoadApi } from '../../api/loads.api';

// While bidding is open or an award waits for an answer, the rank and the clock change under us.
const POLL_STATUSES = ['live', 'awarded'];
const POLL_MS = 30_000;

const errorMessage = (error) =>
    error.response?.status === 404
        ? 'This load does not exist, or your company was not invited to it.'
        : error.response?.data?.message || 'Could not load this load. Please try again.';

/**
 * One load as the transporter sees it (GET /loads/:id), refetched every 30 s while its status
 * is live or awarded. reload() fetches again after an action, keeping the current data on
 * screen meanwhile.
 * @param {string} loadId
 * @returns {{ load: object | null, error: string, isLoading: boolean, reload: () => void }}
 */
export function useTransporterLoad(loadId) {
    const [state, setState] = useState({ load: null, error: '', loadedId: null });
    const [reloadCount, setReloadCount] = useState(0);

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
    const shouldPoll = isCurrent && state.load !== null && POLL_STATUSES.includes(state.load.status);

    useEffect(() => {
        if (!shouldPoll) return undefined;
        let ignore = false;
        const timer = setInterval(() => {
            getLoadApi(loadId)
                .then(({ data }) => {
                    if (!ignore) setState({ load: data.data, error: '', loadedId: loadId });
                })
                .catch(() => {
                    // A failed background refresh is not worth an error screen: the last good
                    // data stays up and the next tick tries again.
                });
        }, POLL_MS);
        return () => {
            ignore = true;
            clearInterval(timer);
        };
    }, [loadId, shouldPoll]);

    return {
        load: isCurrent ? state.load : null,
        error: isCurrent ? state.error : '',
        isLoading: !isCurrent,
        reload: () => setReloadCount((count) => count + 1),
    };
}
