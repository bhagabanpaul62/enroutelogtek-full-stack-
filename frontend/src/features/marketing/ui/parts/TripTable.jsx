// An example trip as the app would record it. Every value is a sample.
const ROWS = [
    ['Awarded', '2026-11-10T09:40+05:30', 'Tue 09:40 IST', 'Sample Roadways, lowest bid'],
    ['Dispatched', '2026-11-11T06:30+05:30', 'Wed 06:30 IST', 'MH 12 AB 0000, from Plant 2'],
    ['In transit', '2026-11-11T18:05+05:30', 'Wed 18:05 IST', 'Last position: Nashik'],
    ['Delivered', '2026-11-12T11:20+05:30', 'Thu 11:20 IST', 'At the Mumbai depot'],
    ['POD uploaded', '2026-11-12T11:48+05:30', 'Thu 11:48 IST', 'Signed POD on the record'],
];

export default function TripTable() {
    return (
        <table className="mk-table">
            <caption>An example trip, award to POD.</caption>
            <thead>
                <tr>
                    <th scope="col">Event</th>
                    <th scope="col">Time</th>
                    <th scope="col">Detail</th>
                </tr>
            </thead>
            <tbody>
                {ROWS.map(([event, dt, time, detail], index) => (
                    <tr key={event} data-current={index === ROWS.length - 1 ? 'true' : undefined}>
                        <th scope="row">{event}</th>
                        <td>
                            <time className="measure" dateTime={dt}>
                                {time}
                            </time>
                        </td>
                        <td>{detail}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
