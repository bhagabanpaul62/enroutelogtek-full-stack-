'use client';

import { Fragment } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';

function ListSkeleton() {
    return (
        <ul
            aria-busy="true"
            aria-label="Loading"
            className="divide-y divide-surface-container-low rounded-md border border-border bg-card"
        >
            {[0, 1, 2, 3].map((row) => (
                <li key={row} className="flex items-center gap-3 px-4 py-3">
                    <div className="size-10 animate-pulse rounded-[4px] bg-surface-container-low" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/3 animate-pulse rounded bg-surface-container-low" />
                        <div className="h-2.5 w-1/4 animate-pulse rounded bg-surface-container-low" />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function ListMessage({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center rounded-md border border-dashed border-border px-6 py-12 text-center">
            {Icon && <Icon size={22} className="mb-3 text-muted-foreground" />}
            <p className="text-[14px] font-medium text-foreground">{title}</p>
            {description && (
                <p className="mt-1 max-w-sm text-[13px] text-[#c6c6c7]">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

/**
 * Renders a list from useCursorList with all its states:
 * loading skeleton, error + retry, empty message, the rows and a "Load more" button.
 */
export default function CursorList({ list, getKey, renderItem, empty }) {
    if (list.isLoading) {
        return <ListSkeleton />;
    }

    if (list.error) {
        return (
            <ListMessage
                icon={AlertTriangle}
                title="Couldn't load this list"
                description={list.error}
                action={
                    <Button variant="outline" onClick={list.reload}>
                        <RefreshCw /> Try again
                    </Button>
                }
            />
        );
    }

    if (list.items.length === 0 && !list.hasMore) {
        return <ListMessage {...empty} />;
    }

    return (
        <div>
            <ul className="divide-y divide-surface-container-low overflow-hidden rounded-md border border-border bg-card">
                {list.items.map((item) => (
                    <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
                ))}
            </ul>

            {list.hasMore && (
                <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={list.loadMore} disabled={list.loadingMore}>
                        {list.loadingMore ? <Loader2 className="animate-spin" /> : null}
                        {list.loadingMore ? 'Loading…' : 'Load more'}
                    </Button>
                </div>
            )}
        </div>
    );
}
