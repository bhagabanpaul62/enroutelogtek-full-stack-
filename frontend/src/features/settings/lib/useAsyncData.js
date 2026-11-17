'use client';

import { useEffect, useState } from 'react';

/**
 * Loads one answer from `fetchData` (a stable axios call answering { data: { data } }).
 * `isLoading` is true until the answer for the current reload arrives; reload() fetches again.
 */
export function useAsyncData(fetchData) {
    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: -1, data: null, error: '' });

    useEffect(() => {
        let ignore = false;
        fetchData()
            .then(({ data }) => !ignore && setResult({ key: reloadCount, data: data.data, error: '' }))
            .catch(
                (e) =>
                    !ignore &&
                    setResult({
                        key: reloadCount,
                        data: null,
                        error: e.response?.data?.message || 'Could not load. Please try again.',
                    }),
            );
        return () => {
            ignore = true;
        };
    }, [fetchData, reloadCount]);

    return {
        data: result.data,
        error: result.key === reloadCount ? result.error : '',
        isLoading: result.key !== reloadCount,
        reload: () => setReloadCount((n) => n + 1),
    };
}
