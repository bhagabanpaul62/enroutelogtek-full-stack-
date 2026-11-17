'use client';

import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { DataGrid } from '@/shared/ui/data-grid';
import { Button } from '@/shared/ui/primitives/button';
import { SidePanel } from '@/shared/ui/kit';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useTeamAction } from '@/features/team/hooks/useTeamAction';
import { getDeliverySummaryApi, listDeliveriesApi, retryDeliveryApi } from '../api/subscriptions.api';

const COLUMNS = [
    { key: 'toEmail', label: 'To', type: 'person', value: (d) => ({ name: d.toEmail, sub: d.title }) },
    { key: 'attempts', label: 'Tries', type: 'number', width: 80 },
    { key: 'lastError', label: 'Last error', type: 'text' },
    { key: 'createdAt', label: 'Created', type: 'date', width: 110 },
];

function FailedList({ onChanged }) {
    const list = useCursorList(listDeliveriesApi, { status: 'failed' });
    const { run, busy } = useTeamAction();
    const retry = async (delivery) => {
        if (await run(() => retryDeliveryApi(delivery.id), 'Queued to send again')) {
            list.removeItem((d) => d.id === delivery.id);
            onChanged();
        }
    };
    return (
        <DataGrid
            columns={COLUMNS}
            list={list}
            getRowId={(d) => d.id}
            rowActions={[{ label: busy ? 'Retrying' : 'Retry', icon: RotateCw, onClick: retry }]}
            empty={{ title: 'No failed emails' }}
            searchPlaceholder="Search failed emails"
            maxHeight="calc(100vh - 12rem)"
        />
    );
}

/**
 * One quiet line on the payments page: how many emails wait or failed. The failed list opens in a
 * side panel with Retry per row. Renders nothing when the summary cannot be read, so it never blocks the page.
 */
export default function DeliveryStrip() {
    const [summary, setSummary] = useState(null);
    const [reloadCount, setReloadCount] = useState(0);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let ignore = false;
        getDeliverySummaryApi()
            .then(({ data }) => {
                if (!ignore) setSummary(data.data);
            })
            .catch(() => {
                if (!ignore) setSummary(null);
            });
        return () => {
            ignore = true;
        };
    }, [reloadCount]);

    if (!summary) return null;
    const failed = summary.failed ?? 0;
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--ds-on-surface-muted)]" data-testid="delivery-strip">
            <span>
                Email, last 7 days: {summary.pending ?? 0} pending, <span className={failed > 0 ? 'text-red-300' : undefined}>{failed} failed</span>
            </span>
            {failed > 0 ? (
                <Button variant="secondary" className="h-8 rounded-lg px-3 text-xs" onClick={() => setOpen(true)}>
                    View failed
                </Button>
            ) : null}
            <SidePanel open={open} onOpenChange={setOpen} size="xl" title="Failed emails" description="Emails that ran out of retries. Retry sends one again.">
                {open ? <FailedList onChanged={() => setReloadCount((c) => c + 1)} /> : null}
            </SidePanel>
        </div>
    );
}
