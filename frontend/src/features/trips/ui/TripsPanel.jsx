'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { EmptyState, ErrorState, Panel, SkeletonRows, ToneBadge } from '@/shared/ui/kit';
import { getTripsApi } from '../api/trips.api';
import { useTripSide } from '../hooks/useTripSide';
import { formatDateTime, rowView } from '../lib/trip';
import TripStatus from './TripStatus';

const DONE = ['delivered', 'completed'];

/**
 * Trips of one load, for the customer's load detail page: "3 of 5 delivered" plus one row per truck.
 * Mount it as <TripsPanel loadId={load.id} />. Rows open the trip record.
 */
export default function TripsPanel({ loadId, className }) {
    const { base } = useTripSide();
    const list = useCursorList(getTripsApi, { loadId, role: 'customer' }, { pageSize: 50 });
    const trips = list.items.map(rowView);
    const delivered = trips.filter((t) => DONE.includes(t.status)).length;
    const live = trips.filter((t) => t.status !== 'cancelled');

    return (
        <Panel title="Trips" action={live.length ? <span className="text-xs tabular-nums text-[var(--ds-on-surface-muted)]">{delivered} of {live.length} delivered</span> : null} className={className}>
            {list.isLoading ? (
                <SkeletonRows rows={2} />
            ) : list.error ? (
                <ErrorState title="Couldn't load trips" description={list.error} onRetry={list.reload} />
            ) : !trips.length ? (
                <EmptyState title="No trucks yet" description="One trip per truck appears once the transporter accepts the award." />
            ) : (
                <ul className="flex flex-col">
                    {trips.map((t) => (
                        <li key={t.id}>
                            <Link href={`${base}/trips/${t.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none" aria-label={`Open ${t.tripNo}`}>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-[var(--ds-on-surface)]">{t.tripNo}{t.vehicle ? `, ${t.vehicle}` : ', truck not assigned yet'}</p>
                                    <p className="truncate text-xs text-[var(--ds-on-surface-muted)]">
                                        {[t.driverName, t.etaAt ? `ETA ${formatDateTime(t.etaAt)}` : t.expectedPlacementAt ? `Expected at pickup ${formatDateTime(t.expectedPlacementAt)}` : null].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                                {t.delayed ? <ToneBadge label="Delayed" tone="warning" /> : null}
                                <TripStatus value={t.status} />
                                <ChevronRight className="size-4 shrink-0 text-[var(--ds-on-surface-muted)]" aria-hidden />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {list.hasMore ? (
                <button type="button" onClick={list.loadMore} disabled={list.loadingMore} className="mt-2 self-start rounded-lg px-3 py-1.5 text-xs text-[var(--ds-on-surface-variant)] hover:bg-white/[0.06]">
                    {list.loadingMore ? 'Loading' : 'Show more'}
                </button>
            ) : null}
        </Panel>
    );
}
