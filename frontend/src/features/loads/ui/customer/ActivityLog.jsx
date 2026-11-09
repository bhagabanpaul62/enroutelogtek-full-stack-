import { formatDateTime } from '../../lib/format';

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

/**
 * The load's audit log, oldest first: every status change, who made it and when.
 * @param {{ events: Array<{ id: string, type: string, note?: string, createdAt: string, actorName?: string, actorCompanyName?: string }> }} props
 */
export default function ActivityLog({ events }) {
    if (events.length === 0) {
        return <p className="text-[13px] text-muted-foreground">No activity recorded yet.</p>;
    }
    return (
        <ol className="relative ml-1.5 border-l border-border">
            {events.map((event) => (
                <li key={event.id} className="relative pb-4 pl-4 last:pb-0">
                    <span
                        aria-hidden="true"
                        className="absolute -left-[4.5px] top-1.5 size-2 rounded-full border border-primary bg-background"
                    />
                    <p className="text-[13px] text-foreground">{EVENT_LABELS[event.type] ?? event.type}</p>
                    {event.note && <p className="text-[12px] text-[#c6c6c7]">{event.note}</p>}
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {formatDateTime(event.createdAt)} · {actorOf(event)}
                    </p>
                </li>
            ))}
        </ol>
    );
}
