'use client';

import { useEffect, useState } from 'react';
import { errorText } from '../lib/format';

const PAGE = 100; // the API maximum
const MAX_PAGES = 10;

/**
 * Loads a page-numbered list (?page&limit) completely, so the data grid can sort and filter all of it.
 * Contracts and indents per company are few; shortcut: stops at 1,000 rows, move to server paging beyond that.
 * `fetchPage` must be a stable function. Re-runs when `params` change or reload() is called.
 */
export function useFetchAll(fetchPage, params = {}, enabled = true) {
    const paramsKey = JSON.stringify(params);
    const [reloadCount, setReloadCount] = useState(0);
    const key = `${paramsKey}#${reloadCount}`;
    const [state, setState] = useState({ key: null, items: [], error: '' });

    useEffect(() => {
        if (!enabled) return undefined;
        let ignore = false;
        (async () => {
            try {
                const items = [];
                for (let page = 1; page <= MAX_PAGES; page += 1) {
                    const { data } = await fetchPage({ ...JSON.parse(paramsKey), page, limit: PAGE });
                    items.push(...data.data);
                    const p = data.pagination ?? {};
                    const more = p.hasNext ?? p.hasMore ?? (p.totalPages ? page < p.totalPages : data.data.length === PAGE && p.total > items.length);
                    if (!more || data.data.length === 0) break;
                }
                if (!ignore) setState({ key, items, error: '' });
            } catch (error) {
                if (!ignore) setState({ key, items: [], error: errorText(error, 'Could not load the list. Please try again.') });
            }
        })();
        return () => {
            ignore = true;
        };
    }, [fetchPage, paramsKey, reloadCount, enabled, key]);

    return {
        items: state.items,
        error: state.error,
        isLoading: enabled && state.key !== key,
        reload: () => setReloadCount((c) => c + 1),
    };
}
