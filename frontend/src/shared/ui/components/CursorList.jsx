'use client';

import { Fragment } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { EmptyState, ErrorState, SkeletonRows } from '@/shared/ui/kit';

/**
 * Renders a list from useCursorList with all its states:
 * loading skeleton, error + retry, empty message, the rows and a "Load more" button.
 * Tables use DataGrid instead; this is for lists of cards or rows that are not a table.
 */
export default function CursorList({ list, getKey, renderItem, empty }) {
    if (list.isLoading) {
        return <SkeletonRows rows={4} />;
    }

    if (list.error) {
        return <ErrorState title="Couldn't load this list" description={list.error} onRetry={list.reload} />;
    }

    if (list.items.length === 0 && !list.hasMore) {
        return <EmptyState title={empty?.title} description={empty?.description} action={empty?.action} />;
    }

    return (
        <div>
            <ul className="flex flex-col gap-1">
                {list.items.map((item) => (
                    <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
                ))}
            </ul>

            {list.hasMore && (
                <div className="flex justify-center pt-4">
                    <Button variant="secondary" onClick={list.loadMore} disabled={list.loadingMore}>
                        {list.loadingMore ? <Loader2 className="animate-spin" /> : null}
                        {list.loadingMore ? 'Loading…' : 'Load more'}
                    </Button>
                </div>
            )}
        </div>
    );
}
