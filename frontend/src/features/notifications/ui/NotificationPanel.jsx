'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { timeAgo } from '@/features/network/lib/timeAgo';

const LINK_BUTTON = 'text-[11px] text-primary hover:underline disabled:opacity-50';

function Skeleton() {
    return (
        <ul aria-busy="true" aria-label="Loading" className="divide-y divide-[#1c1b1b]">
            {[0, 1, 2].map((row) => (
                <li key={row} className="space-y-2 px-3 py-3">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[#1c1b1b]" />
                    <div className="h-2.5 w-full animate-pulse rounded bg-[#1c1b1b]" />
                    <div className="h-2 w-1/4 animate-pulse rounded bg-[#1c1b1b]" />
                </li>
            ))}
        </ul>
    );
}

function Item({ item, onOpen }) {
    return (
        <li>
            <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[#181818]"
            >
                <span
                    aria-hidden="true"
                    className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', item.isRead ? 'bg-transparent' : 'bg-primary')}
                />
                <span className="min-w-0 flex-1">
                    <span
                        className={cn(
                            'block truncate text-[13px]',
                            item.isRead ? 'text-[#c6c6c7]' : 'font-medium text-[#e5e2e1]',
                        )}
                    >
                        {!item.isRead && <span className="sr-only">Unread: </span>}
                        {item.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-[#9a9a9a]">
                        {item.message}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-[#525B7A]">
                        {timeAgo(item.createdAt)}
                    </span>
                </span>
            </button>
        </li>
    );
}

/**
 * The dropdown under the bell: the list with its loading, error and empty states, "Mark all
 * read" and "Load more".
 * @param {{ notifications: ReturnType<import('../hooks/useNotifications').useNotifications>, onOpenItem: (item: object) => void }} props
 */
export default function NotificationPanel({ notifications, onOpenItem }) {
    const { items, unreadCount, isLoading, error, hasMore, loadingMore, loadMore, markAllRead, reload } =
        notifications;

    let body;
    if (isLoading) {
        body = <Skeleton />;
    } else if (error) {
        body = (
            <div className="flex flex-col items-start gap-2 p-4">
                <p className="flex items-center gap-1.5 text-[13px] text-[#c6c6c7]">
                    <AlertTriangle size={14} className="shrink-0 text-[#f0955a]" /> {error}
                </p>
                <button type="button" onClick={reload} className={LINK_BUTTON}>
                    Try again
                </button>
            </div>
        );
    } else if (items.length === 0) {
        body = (
            <p className="p-4 text-[13px] text-[#525B7A]">
                Nothing yet. Load invitations, bids and awards will show here.
            </p>
        );
    } else {
        body = (
            <ul className="divide-y divide-[#1c1b1b]">
                {items.map((item) => (
                    <Item key={item.id} item={item} onOpen={onOpenItem} />
                ))}
            </ul>
        );
    }

    return (
        <div
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 mt-2 w-80 bg-[#111111] border border-[#222222] rounded-[6px] shadow-2xl z-50 overflow-hidden"
        >
            <div className="flex items-center justify-between gap-3 border-b border-[#222222] p-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#e5e2e1] font-semibold">
                    Notifications
                </span>
                {unreadCount > 0 && (
                    <button type="button" onClick={markAllRead} className={LINK_BUTTON}>
                        Mark all read
                    </button>
                )}
            </div>

            <div className="max-h-[70vh] overflow-y-auto">{body}</div>

            {hasMore && !isLoading && !error && (
                <div className="flex justify-center border-t border-[#222222] p-2">
                    <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-1.5 rounded-[4px] px-3 py-1 text-[12px] text-[#c6c6c7] hover:bg-[#181818] hover:text-[#e5e2e1] disabled:opacity-50"
                    >
                        {loadingMore && <Loader2 size={12} className="animate-spin" />}
                        {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                </div>
            )}
        </div>
    );
}
