'use client';

import { CalendarClock, FileWarning } from 'lucide-react';
import { EmptyState, Panel, SummaryRows } from '@/shared/ui/kit';
import { daysUntil, EXPIRING_DAYS, expiryText } from '../lib/fleet';

/**
 * "Expiring soon": every document across the loaded records that is expired or due within 30 days.
 * records: vehicles or drivers; docs: VEHICLE_DOCS / DRIVER_DOCS; nameOf(record); hrefOf(record).
 */
export default function ExpiringPanel({ records, docs, nameOf, hrefOf, loading }) {
    const now = new Date();
    const rows = [];
    for (const record of records) {
        for (const doc of docs) {
            const days = daysUntil(record[doc.expiryKey], now);
            if (days !== null && days < EXPIRING_DAYS) rows.push({ record, doc, days });
        }
    }
    rows.sort((a, b) => a.days - b.days);
    const shown = rows.slice(0, 6);

    return (
        <Panel title="Expiring soon" action={rows.length > shown.length ? <span className="text-xs text-[var(--ds-on-surface-muted)]">+{rows.length - shown.length} more</span> : null}>
            {loading ? (
                <p className="py-6 text-center text-sm text-[var(--ds-on-surface-muted)]" aria-busy="true">Checking documents…</p>
            ) : shown.length === 0 ? (
                <EmptyState title="Nothing expiring in the next 30 days" description="Papers that are due or past due show up here." />
            ) : (
                <SummaryRows
                    rows={shown.map(({ record, doc, days }) => ({
                        key: `${record.id}-${doc.key}`,
                        label: `${nameOf(record)} · ${doc.label} ${expiryText(days)}`,
                        value: '',
                        icon: days < 0 ? <FileWarning className="size-4" aria-hidden /> : <CalendarClock className="size-4" aria-hidden />,
                        tone: days < 0 ? 'danger' : 'warning',
                        href: hrefOf(record),
                    }))}
                />
            )}
        </Panel>
    );
}
