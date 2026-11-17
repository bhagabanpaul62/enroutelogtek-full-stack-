'use client';

import { useCallback, useEffect, useState } from 'react';
import { getTripApi, apiMessage } from '../api/trips.api';

/** One trip record with reload(); `data` keeps the last good answer while a reload runs. */
export function useTrip(tripId) {
    const [state, setState] = useState({ data: null, error: '', loading: true });
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let ignore = false;
        getTripApi(tripId)
            .then((data) => !ignore && setState({ data, error: '', loading: false }))
            .catch((error) => !ignore && setState((s) => ({ data: s.data, error: apiMessage(error, 'Could not load this trip.'), loading: false })));
        return () => {
            ignore = true;
        };
    }, [tripId, tick]);

    const reload = useCallback(() => setTick((n) => n + 1), []);
    return { ...state, reload };
}
