import { EmptyState } from '@/shared/ui/kit';
import { formatDate, formatDateTime } from '../../lib/format';

// What each audit event is called on screen. Types come from backend loadEvent.service.js.
const EVENT_LABELS = {
    created: 'Draft created',
    published: 'Published, bidding opened',
    extended: 'Bidding extended',
    auto_extended: 'Bidding extended automatically',
    closed: 'Bidding closed',
    expired: 'Closed with no bids',
    awarded: 'Winner picked',
    accepted: 'Transporter accepted',
    declined: 'Transporter declined',
    award_expired: 'Transporter did not answer in time',
    assigned: 'Truck and driver assigned',
    reassigned: 'Truck and driver changed',
    completed: 'Marked delivered',
    cancelled: 'Cancelled',
};

/** Who did it: "Name, Company", or "Enroute" for the clock job (no actor). */
const actorOf = (event) =>
    event.actorName
        ? [event.actorName, event.actorCompanyName].filter(Boolean).join(', ')
        : 'Enroute (automatic)';

const time = (iso) => formatDateTime(iso).replace(/^.*?, (?=\d{1,2}:\d{2})/, '');

/** Events grouped by calendar day (Indian time), newest day first, oldest event first inside a day. */
const groupByDay = (events) => {
    const groups = [];
    for (const event of events) {
        const day = formatDate(event.createdAt);
        const last = groups[groups.length - 1];
        if (last?.day === day) last.items.push(event);
        else groups.push({ day, items: [event] });
    }
    return groups.reverse();
};

/**
 * The load's audit log as a feed grouped by day: every status change, who made it and when.
 * @param {{ events: Array<{ id: string, type: string, note?: string, createdAt: string, actorName?: string, actorCompanyName?: string }> }} props
 */
export default function ActivityLog({ events }) {
    if (events.length === 0) {
        return <EmptyState title="No activity yet" description="Every status change on this load shows up here." />;
    }
    return (
        <div className="flex flex-col gap-6">
            {groupByDay(events).map((group) => (
                <section key={group.day}>
                    <h4 className="mb-2 font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">{group.day}</h4>
                    <ol className="flex flex-col">
                        {group.items.map((event) => (
                            <li key={event.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]">
                                <span className="pt-px text-xs tabular-nums text-[var(--ds-on-surface-muted)]">{time(event.createdAt)}</span>
                                <div className="min-w-0">
                                    <p className="text-sm text-[var(--ds-on-surface)]">{EVENT_LABELS[event.type] ?? event.type}</p>
                                    {event.note && <p className="text-xs text-[var(--ds-on-surface-variant)]">{event.note}</p>}
                                    <p className="text-xs text-[var(--ds-on-surface-muted)]">{actorOf(event)}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>
            ))}
        </div>
    );
}
