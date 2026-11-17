'use client';

import { useEffect, useState } from 'react';
import { getRfqInviteesApi, getVehicleTypesApi } from '../api/rfq.api';

/** Loads a list once (and again on reload). `fetcher` must be a stable function. */
function useList(fetcher, params, failure) {
    const key = JSON.stringify(params ?? {});
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState({ key: null, items: [], error: '' });
    const requestKey = `${key}#${attempt}`;

    useEffect(() => {
        let ignore = false;
        fetcher(JSON.parse(key))
            .then(({ data }) => {
                if (!ignore) setState({ key: requestKey, items: data.data ?? [], error: '' });
            })
            .catch((error) => {
                if (!ignore) setState({ key: requestKey, items: [], error: error.response?.data?.message || failure });
            });
        return () => {
            ignore = true;
        };
    }, [fetcher, key, requestKey, failure]);

    return {
        items: state.items,
        error: state.error,
        isLoading: state.key !== requestKey,
        reload: () => setAttempt((n) => n + 1),
    };
}

/** Active truck types, for the lane editor. */
export const useVehicleTypes = () => useList(getVehicleTypesApi, {}, 'Could not load the truck types.');

/** Connected transporters the customer can invite; `search` is already debounced. */
export const useRfqInvitees = (search = '') =>
    useList(getRfqInviteesApi, search ? { search } : {}, 'Could not load your transporters.');
