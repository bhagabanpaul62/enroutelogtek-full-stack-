'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
const DEFAULT_PAGE_SIZE = 20;

const errorMessage = (error) =>
    error.response?.data?.message || 'Could not load the list. Please try again.';

// Drop empty filters: the API rejects companyType="" and an empty search means "no search".
const cleanParams = (params) =>
    Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );

/**
 * Loads a cursor-paginated list from any API that answers { data: [...], pagination: { nextCursor } }.
 * - The first page loads whenever `params` change (or after reload()).
 * - loadMore() appends the next page using the cursor from the last response.
 * `fetchPage` must be a stable function - the functions in a feature's api file are.
 */
export function useCursorList(fetchPage, params = {}, { pageSize = DEFAULT_PAGE_SIZE } = {}) {
    const paramsKey = JSON.stringify(cleanParams(params));
    const [reloadCount, setReloadCount] = useState(0);
    const requestKey = `${paramsKey}#${reloadCount}`;

    // `key` says which params the stored page belongs to.
    const [page, setPage] = useState({ key: null, items: [], nextCursor: null, error: '' });
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        // When params change before the answer arrives, the old answer is ignored.
        let ignore = false;
        const key = `${paramsKey}#${reloadCount}`;

        fetchPage({ ...JSON.parse(paramsKey), limit: pageSize })
            .then(({ data }) => {
                if (!ignore) {
                    setPage({ key, items: data.data, nextCursor: data.pagination.nextCursor, error: '' });
                }
            })
            .catch((error) => {
                if (!ignore) {
                    setPage({ key, items: [], nextCursor: null, error: errorMessage(error) });
                }
            });

        return () => {
            ignore = true;
        };
    }, [fetchPage, paramsKey, reloadCount, pageSize]);

    const loadMore = async () => {
        if (!page.nextCursor || loadingMore) return;

        const key = page.key;
        setLoadingMore(true);
        try {
            const { data } = await fetchPage({
                ...JSON.parse(paramsKey),
                limit: pageSize,
                cursor: page.nextCursor,
            });
            // Only append if the list wasn't reset (new filters) in the meantime.
            setPage((prev) =>
                prev.key === key
                    ? {
                          ...prev,
                          items: [...prev.items, ...data.data],
                          nextCursor: data.pagination.nextCursor,
                      }
                    : prev,
            );
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setLoadingMore(false);
        }
    };

    // Take a row out after an action (accepted, removed, ...) without reloading everything.
    const removeItem = (predicate) => {
        setPage((prev) => ({ ...prev, items: prev.items.filter((item) => !predicate(item)) }));
    };

    return {
        items: page.items,
        error: page.error,
        isLoading: page.key !== requestKey,
        hasMore: Boolean(page.nextCursor),
        loadingMore,
        loadMore,
        reload: () => setReloadCount((count) => count + 1),
        removeItem,
    };
}
