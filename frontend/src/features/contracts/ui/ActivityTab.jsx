'use client';

import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, Panel, SkeletonRows, formatDate, formatDateTime } from '@/shared/ui/kit';
import { getContractEventsApi } from '../api/contract.api';
import { EVENT_LABELS } from '../constants';
import { errorText } from '../lib/format';

const time = (iso) => formatDateTime(iso).replace(/^.*?, (?=\d{1,2}:\d{2})/, '');
const actorOf = (e) => (e.actorName ? [e.actorName, e.actorCompanyName].filter(Boolean).join(', ') : 'Enroute (automatic)');

/** Every step on the contract, who did it and when, newest day first. */
export default function ActivityTab({ contract }) {
    const [state, setState] = useState({ key: null, events: [], error: '' });
    const [reloadCount, setReloadCount] = useState(0);
    const key = `${contract.id}|${contract.version}|${contract.status}|${reloadCount}`;

    useEffect(() => {
        let ignore = false;
        getContractEventsApi(contract.id)
            .then(({ data }) => !ignore && setState({ key, events: data.data, error: '' }))
            .catch((error) => !ignore && setState({ key, events: [], error: errorText(error, 'Could not load the activity.') }));
        return () => {
            ignore = true;
        };
    }, [contract.id, key]);

    const groups = [];
    for (const event of [...state.events].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
        const day = formatDate(event.createdAt);
        const last = groups[groups.length - 1];
        if (last?.day === day) last.items.push(event);
        else groups.push({ day, items: [event] });
    }
    groups.reverse();

    return (
        <Panel title="Activity">
            {state.key !== key ? (
                <SkeletonRows rows={4} />
            ) : state.error ? (
                <ErrorState title="Activity could not be loaded" description={state.error} onRetry={() => setReloadCount((c) => c + 1)} />
            ) : groups.length === 0 ? (
                <EmptyState title="No activity yet" description="Every indent, amendment and status change on this contract shows up here." />
            ) : (
                <div className="flex flex-col gap-6">
                    {groups.map((group) => (
                        <section key={group.day}>
                            <h4 className="mb-2 font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">{group.day}</h4>
                            <ol className="flex flex-col">
                                {group.items.map((event) => (
                                    <li key={event.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]">
                                        <span className="pt-px text-xs tabular-nums text-[var(--ds-on-surface-muted)]">{time(event.createdAt)}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm text-[var(--ds-on-surface)]">{EVENT_LABELS[event.type] ?? event.type.replace(/_/g, ' ')}</p>
                                            {event.note ? <p className="mt-0.5 text-[13px] text-[var(--ds-on-surface-variant)]">{event.note}</p> : null}
                                            <p className="mt-0.5 text-xs text-[var(--ds-on-surface-muted)]">{actorOf(event)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    ))}
                </div>
            )}
        </Panel>
    );
}
