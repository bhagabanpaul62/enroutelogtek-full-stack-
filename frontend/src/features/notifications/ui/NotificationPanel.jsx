'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { EmptyState, ErrorState, SkeletonRows, formatDate, formatRelative } from '@/shared/ui/kit';

const dayKey = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** Items (newest first) into [{ key, label, items }] with "Today" / "Yesterday" / "Nov 15" labels. */
function groupByDay(items) {
    const todayMs = Date.now();
    const today = dayKey(todayMs);
    const yesterday = dayKey(todayMs - 86400000);
    const groups = [];
    for (const item of items) {
        const key = dayKey(item.createdAt);
        let group = groups[groups.length - 1];
        if (group?.key !== key) {
            group = { key, label: key === today ? 'Today' : key === yesterday ? 'Yesterday' : formatDate(item.createdAt), items: [] };
            groups.push(group);
        }
        group.items.push(item);
    }
    return groups;
}

function Item({ item, onOpen }) {
    return (
        <li>
            <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-150 hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
            >
                <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', item.isRead ? 'bg-transparent' : 'bg-primary')} />
                <span className="min-w-0 flex-1">
                    <span className={cn('block text-[13px]', item.isRead ? 'text-[var(--ds-on-surface-variant)]' : 'font-medium text-[var(--ds-on-surface)]')}>
                        {!item.isRead ? <span className="sr-only">Unread: </span> : null}
                        {item.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-[var(--ds-on-surface-muted)]">{item.message}</span>
                    <span className="mt-1 block text-[11px] text-[var(--ds-on-surface-muted)]">{formatRelative(item.createdAt)}</span>
                </span>
            </button>
        </li>
    );
}

/**
 * The body of the notifications side panel: the list grouped by day, with its loading, error and
 * empty states and "Load more". "Mark all read" lives in the panel header (NotificationBell).
 * @param {{ notifications: ReturnType<import('../hooks/useNotifications').useNotifications>, onOpenItem: (item: object) => void }} props
 */
export default function NotificationPanel({ notifications, onOpenItem }) {
    const { items, isLoading, error, hasMore, loadingMore, loadMore, reload } = notifications;

    if (isLoading) return <SkeletonRows rows={5} />;
    if (error) return <ErrorState title="Couldn't load notifications" description={error} onRetry={reload} />;
    if (items.length === 0) {
        return <EmptyState title="Nothing yet" description="Load invitations, bids and awards will show up here." />;
    }

    return (
        <div className="flex flex-col gap-5">
            {groupByDay(items).map((group) => (
                <section key={group.key} aria-label={group.label}>
                    <h3 className="px-3 pb-1 font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">{group.label}</h3>
                    <ul>
                        {group.items.map((item) => (
                            <Item key={item.id} item={item} onOpen={onOpenItem} />
                        ))}
                    </ul>
                </section>
            ))}
            {hasMore ? (
                <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-medium text-[var(--ds-on-surface-variant)] transition-colors duration-150 hover:bg-white/[0.12] disabled:opacity-50"
                >
                    {loadingMore ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                    {loadingMore ? 'Loading…' : 'Load more'}
                </button>
            ) : null}
        </div>
    );
}
