'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    getNotificationsApi,
    getUnreadCountApi,
    markAllReadApi,
    markReadApi,
} from '../api/notifications.api';

const PAGE_SIZE = 20;
const UNREAD_POLL_MS = 60_000;

const errorMessage = (error) =>
    error.response?.data?.message || 'Something went wrong. Please try again.';

/**
 * The signed-in user's notifications, for the header bell.
 * - The unread count (the badge) loads on mount and again every 60 s while mounted.
 * - The list loads when reload() is first called (the bell calls it when the panel opens) and
 *   refreshes on every later call, keeping the rows on screen until the new page arrives.
 * - markRead / markAllRead update the screen first and roll back with a toast if the server
 *   refuses.
 * @returns {{
 *   items: object[], unreadCount: number, isLoading: boolean, error: string, hasMore: boolean,
 *   loadingMore: boolean, reload: () => void, loadMore: () => Promise<void>,
 *   markRead: (id: string) => Promise<void>, markAllRead: () => Promise<void>
 * }}
 */
export function useNotifications() {
    // null until the panel has been opened once; then a counter that reload() bumps.
    const [listKey, setListKey] = useState(null);
    // `key` says which request the stored page answers.
    const [page, setPage] = useState({ key: null, items: [], nextCursor: null, error: '' });
    const [loadingMore, setLoadingMore] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Badge count: now and every minute. A failed poll keeps the last value; the next tick retries.
    useEffect(() => {
        let ignore = false;
        const refresh = () =>
            getUnreadCountApi()
                .then(({ data }) => {
                    if (!ignore) setUnreadCount(data.data.count);
                })
                .catch(() => {
                    // Quiet on purpose: a toast every minute for a background count would be noise.
                });
        refresh();
        const timer = setInterval(refresh, UNREAD_POLL_MS);
        return () => {
            ignore = true;
            clearInterval(timer);
        };
    }, []);

    // First page: whenever listKey changes (first open, a later open, or retry).
    useEffect(() => {
        if (listKey === null) return undefined;
        let ignore = false;
        getNotificationsApi({ limit: PAGE_SIZE })
            .then(({ data }) => {
                if (!ignore) {
                    setPage({ key: listKey, items: data.data, nextCursor: data.pagination.nextCursor, error: '' });
                }
            })
            .catch((error) => {
                if (!ignore) setPage({ key: listKey, items: [], nextCursor: null, error: errorMessage(error) });
            });
        return () => {
            ignore = true;
        };
    }, [listKey]);

    const loadMore = async () => {
        if (!page.nextCursor || loadingMore) return;
        const key = page.key;
        setLoadingMore(true);
        try {
            const { data } = await getNotificationsApi({ limit: PAGE_SIZE, cursor: page.nextCursor });
            // Only append if the list was not refreshed in the meantime.
            setPage((prev) =>
                prev.key === key
                    ? { ...prev, items: [...prev.items, ...data.data], nextCursor: data.pagination.nextCursor }
                    : prev,
            );
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setLoadingMore(false);
        }
    };

    const setRead = (ids, isRead) => {
        const readAt = isRead ? new Date().toISOString() : null;
        setPage((prev) => ({
            ...prev,
            items: prev.items.map((item) => (ids.has(item.id) ? { ...item, isRead, readAt } : item)),
        }));
    };

    const markRead = async (id) => {
        const target = page.items.find((item) => item.id === id);
        if (!target || target.isRead) return;
        const ids = new Set([id]);
        setRead(ids, true);
        setUnreadCount((count) => Math.max(0, count - 1));
        try {
            await markReadApi(id);
        } catch (error) {
            setRead(ids, false);
            setUnreadCount((count) => count + 1);
            toast.error(errorMessage(error));
        }
    };

    const markAllRead = async () => {
        const unreadIds = new Set(page.items.filter((item) => !item.isRead).map((item) => item.id));
        const countBefore = unreadCount;
        setRead(unreadIds, true);
        setUnreadCount(0);
        try {
            await markAllReadApi();
        } catch (error) {
            setRead(unreadIds, false);
            setUnreadCount(countBefore);
            toast.error(errorMessage(error));
        }
    };

    return {
        items: page.items,
        unreadCount,
        // Skeleton only when there is nothing to show yet; a refresh keeps the old rows up.
        isLoading: listKey !== null && page.key !== listKey && page.items.length === 0,
        error: page.error,
        hasMore: Boolean(page.nextCursor),
        loadingMore,
        reload: () => setListKey((key) => (key ?? 0) + 1),
        loadMore,
        markRead,
        markAllRead,
    };
}
