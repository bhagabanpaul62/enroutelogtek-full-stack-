import Image from 'next/image';
import Link from 'next/link';
import connectionsShot from '../../../../public/screens/network-connections.png';
import CompanyTypeSwitcher from './parts/CompanyTypeSwitcher';

// Facts per company type come from the product: the documents registration asks for, the rule
// that connections run only between different types, and each type's own dashboard sections.
const TYPES = [
    {
        id: 'customer',
        label: 'Manufacturers and shippers',
        title: 'Manufacturers and shippers',
        facts: [
            ['Registers with', 'GST and PAN'],
            ['Connects with', 'Transporters, brokers, fleet owners'],
            ['Posts', 'RFQs for its loads'],
        ],
        screens: [
            ['RFQs', 'A load, its window, its bids'],
            ['Contracts', 'The awarded bid'],
            ['Trips', 'Dispatch to POD'],
            ['Network', 'Your carriers'],
            ['Team', 'Seats and roles'],
            ['Reports', 'Across RFQs and trips'],
        ],
    },
    {
        id: 'transporter',
        label: 'Transporters',
        title: 'Transporters',
        facts: [
            ['Registers with', 'GST and PAN'],
            ['Connects with', 'Shippers, brokers, fleet owners'],
            ['Bids on', 'RFQs from connected shippers'],
        ],
        screens: [
            ['RFQs', 'Open to you, on a clock'],
            ['Bids', 'Yours, and where they stand'],
            ['Contracts', 'What you have won'],
            ['Fleet', 'Your vehicles'],
            ['Drivers', 'Who is on which trip'],
            ['Trips', 'Dispatch to POD'],
        ],
    },
    {
        id: 'broker',
        label: 'Brokers',
        title: 'Brokers',
        facts: [
            ['Registers with', 'PAN'],
            ['Connects with', 'Shippers, transporters, fleet owners'],
            ['Arranges', 'Trucks for connected shippers'],
        ],
        screens: [
            ['Loads', 'What needs moving'],
            ['Transporters', 'Who you place loads with'],
            ['Fleet owners', 'Trucks you can call on'],
            ['Trips', 'Dispatch to POD'],
        ],
    },
    {
        id: 'fleet_owner',
        label: 'Fleet owners',
        title: 'Fleet owners',
        facts: [
            ['Registers with', 'PAN'],
            ['Connects with', 'Shippers, transporters, brokers'],
            ['Provides', 'Vehicles and drivers for trips'],
        ],
        screens: [
            ['Loads', 'What your trucks can take'],
            ['Vehicles', 'Each truck and its papers'],
            ['Drivers', 'Who is on which trip'],
            ['Trips', 'Dispatch to POD'],
            ['Earnings', 'Per trip, per vehicle'],
        ],
    },
];

const COLUMNS = ['Shippers', 'Transporters', 'Brokers', 'Fleet owners'];

const MATRIX = [
    ['Manufacturers and shippers', ['No', 'Yes', 'Yes', 'Yes']],
    ['Transporters', ['Yes', 'No', 'Yes', 'Yes']],
    ['Brokers', ['Yes', 'Yes', 'No', 'Yes']],
    ['Fleet owners', ['Yes', 'Yes', 'Yes', 'No']],
];

export default function SolutionPage() {
    return (
        <div className="mk mk-page">
            <header className="container mk-banner">
                <h1>Four company types, one load record.</h1>
                <div className="mk-banner__side">
                    <p className="lead">
                        What each signs up with, who it connects with, what it sees.
                    </p>
                    <Link className="mk-btn mk-btn--primary" href="/register">
                        Register your company
                    </Link>
                </div>
            </header>

            <section className="container mk-section--s" aria-labelledby="types-title">
                <div className="mk-head">
                    <h2 id="types-title">Pick your company type</h2>
                </div>
                <div style={{ marginTop: 'var(--space-xl)' }}>
                    <CompanyTypeSwitcher types={TYPES} />
                </div>
            </section>

            <section className="container mk-section" aria-labelledby="matrix-title">
                <div className="mk-grid">
                    <div className="mk-head mk-head--split">
                        <h2 id="matrix-title">Who can connect with whom</h2>
                        <p className="lead">
                            Connections run only between different types, and both sides must
                            accept.
                        </p>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <table className="mk-table mk-table--labelled">
                            <thead>
                                <tr>
                                    <th scope="col">Your company</th>
                                    <th scope="col">Shippers</th>
                                    <th scope="col">Transporters</th>
                                    <th scope="col">Brokers</th>
                                    <th scope="col">Fleet owners</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MATRIX.map(([name, cells]) => (
                                    <tr key={name}>
                                        <th scope="row">{name}</th>
                                        {cells.map((cell, index) => (
                                            <td key={index} data-label={COLUMNS[index]}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="container mk-section--l" aria-labelledby="network-title">
                <div className="mk-grid">
                    <div className="mk-head mk-head--split">
                        <h2 id="network-title">The network, as a shipper sees it</h2>
                        <p className="lead">
                            Every connected company with its type and Enroute ID. Remove or block
                            at any time.
                        </p>
                    </div>
                    <figure className="mk-shot" style={{ gridColumn: '1 / -1' }}>
                        <div className="mk-ticks">
                            <Image
                                src={connectionsShot}
                                alt="A shipper's network: four connected companies with their type, Enroute ID, and the buttons to remove or block"
                                sizes="(min-width: 90rem) 1312px, 100vw"
                            />
                        </div>
                        <figcaption className="mk-caption">
                            The connections tab, with sample companies.
                        </figcaption>
                    </figure>
                </div>
            </section>
        </div>
    );
}
