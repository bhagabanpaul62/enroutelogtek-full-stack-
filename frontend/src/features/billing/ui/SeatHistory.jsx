'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DataGrid } from '@/shared/ui/data-grid';
import { Panel } from '@/shared/ui/kit';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { billingApi } from '../api/billing.api';

const REASON = { trial_started: 'Trial started', plan_approved: 'New plan', renewal_approved: 'Renewal', extra_seats_approved: 'Extra seats added' };

const COLUMNS = [
    { key: 'createdAt', label: 'Date', type: 'date', width: 110, filterable: false },
    { key: 'reason', label: 'Why', type: 'text', value: (c) => REASON[c.reason] ?? String(c.reason ?? '').replace(/_/g, ' '), filterable: false },
    {
        key: 'seats',
        label: 'Seats',
        type: 'text',
        value: (c) => `${(c.includedBefore ?? 0) + (c.extraBefore ?? 0)} → ${(c.includedAfter ?? 0) + (c.extraAfter ?? 0)}`,
        filterable: false,
        sortable: false,
    },
];

function History() {
    const list = useCursorList(billingApi.getSeatChanges);
    return <DataGrid columns={COLUMNS} list={list} maxHeight="320px" empty={{ title: 'No seat changes yet' }} />;
}

/** Collapsed by default so the grid only fetches when someone opens it. */
export default function SeatHistory() {
    const [open, setOpen] = useState(false);
    return (
        <Panel
            title="Seat history"
            action={
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls="seat-history-body"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-[var(--ds-on-surface-variant)] hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                >
                    {open ? 'Hide' : 'Show'}
                    <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                </button>
            }
        >
            <div id="seat-history-body">
                {open ? <History /> : <p className="text-sm text-[var(--ds-on-surface-muted)]">Every time your seat count changed, and why.</p>}
            </div>
        </Panel>
    );
}
