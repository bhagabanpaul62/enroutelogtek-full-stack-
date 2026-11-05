// An example RFQ window drawn as a timeline: a 24-hour axis, the window as a band, each event a pin.
// Every value is a sample; the caption says so.
const TICKS = [
    ['0%', '09:00 IST'],
    ['23.1%', '15:00 IST'],
    ['46.2%', '21:00 IST'],
    ['69.2%', '03:00 IST'],
    ['92.3%', '09:00 IST'],
];

const EVENTS = [
    { x: '0%', kind: 'mark', label: 'RFQ posted', time: '09:00 IST', dt: '2026-11-09T09:00+05:30' },
    { x: '4.6%', kind: 'bid', label: 'Bid 1', time: '10:12 IST', dt: '2026-11-09T10:12+05:30' },
    { x: '13.5%', kind: 'bid', label: 'Bid 2', time: '12:30 IST', dt: '2026-11-09T12:30+05:30' },
    { x: '19.5%', kind: 'bid', label: 'Bid 3', time: '14:05 IST', dt: '2026-11-09T14:05+05:30' },
    { x: '28.8%', kind: 'bid', label: 'Bid 4', time: '16:30 IST', dt: '2026-11-09T16:30+05:30' },
    { x: '38.1%', kind: 'bid', label: 'Bid 5', time: '18:55 IST', dt: '2026-11-09T18:55+05:30' },
    { x: '92.3%', kind: 'mark', label: 'Window closes', time: '09:00 IST, day 2', dt: '2026-11-10T09:00+05:30', edge: 'end' },
    { x: '98%', kind: 'award', label: 'Awarded', time: '09:40 IST, day 2', dt: '2026-11-10T09:40+05:30', edge: 'end' },
];

export default function RfqTimeline() {
    return (
        <figure className="mk-timeline" aria-label="Timeline of an example RFQ">
            <div className="mk-timeline__plot">
                <div className="mk-timeline__axis" aria-hidden="true" />
                <span
                    className="mk-timeline__window"
                    aria-hidden="true"
                    style={{ '--from': '0%', '--to': '92.3%' }}
                />
                <ul className="mk-timeline__ticks" aria-hidden="true">
                    {TICKS.map(([x, label]) => (
                        <li key={x} style={{ '--x': x }}>
                            <time className="measure">{label}</time>
                        </li>
                    ))}
                </ul>
                <ol className="mk-timeline__events">
                    {EVENTS.map((event) => (
                        <li
                            key={event.label}
                            style={{ '--x': event.x }}
                            data-kind={event.kind}
                            data-edge={event.edge}
                        >
                            <span>
                                <span className="mk-timeline__label">{event.label}</span>
                                <time className="measure" dateTime={event.dt}>
                                    {event.time}
                                </time>
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
            <p className="mk-timeline__key">
                <span>
                    <i aria-hidden="true" />
                    24-hour bidding window
                </span>
                <span>
                    <i aria-hidden="true" data-kind="bid" />
                    a bid
                </span>
            </p>
            <figcaption className="mk-caption">
                An example RFQ: five bids inside its 24-hour window, awarded the next morning.
            </figcaption>
        </figure>
    );
}
