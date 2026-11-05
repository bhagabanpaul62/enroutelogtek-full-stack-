import Link from 'next/link';
import JsonLd from './parts/JsonLd';
import Stages from './parts/Stages';
import Questions from './parts/Questions';
import { homeQuestions } from '../content/questions';

const SITE = 'https://enroutelogtek.in';

const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': `${SITE}/#organization`,
            name: 'EnrouteLogtek',
            url: SITE,
            logo: `${SITE}/icon.png`,
            email: 'hello@enroutelogtek.in',
            slogan: 'Smarter logistics. Stronger future.',
        },
        {
            '@type': 'WebSite',
            '@id': `${SITE}/#website`,
            url: SITE,
            name: 'EnrouteLogtek',
            publisher: { '@id': `${SITE}/#organization` },
        },
        {
            '@type': 'SoftwareApplication',
            name: 'EnrouteLogtek',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: SITE,
            description:
                'Logistics procurement and transport management for manufacturers, transporters, brokers and fleet owners: a verified network, RFQs, bids, contracts and trips with proof of delivery.',
        },
    ],
};

const STAGES = [
    ['1', 'Register', '#stage-1'],
    ['2', 'Approval', '#stage-2'],
    ['3', 'Network', '#stage-3'],
    ['4', 'RFQ and bids', '#stage-4'],
    ['5', 'Trip and POD', '#stage-5'],
];

export default function HomePage() {
    return (
        <div className="mk mk-page">
            <JsonLd data={structuredData} />

            {/* Hero: one centred column at poster scale, the five stages as a ledger at its foot */}
            <section className="container mk-hero" aria-labelledby="hero-title">
                <div className="mk-hero__body">
                    <h1 id="hero-title">Put every load out to bid.</h1>
                    <p className="lead mk-hero__lead">
                        Shippers post the RFQ; connected transporters, brokers and fleet owners
                        bid.
                    </p>
                    <div className="mk-hero__actions">
                        <Link className="mk-btn mk-btn--primary" href="/register">
                            Register your company
                        </Link>
                    </div>
                </div>
                <ol className="mk-hero__foot" aria-label="The five stages">
                    {STAGES.map(([number, name, href]) => (
                        <li key={number}>
                            <a href={href}>
                                <span className="measure" aria-hidden="true">
                                    {number}
                                </span>
                                {name}
                            </a>
                        </li>
                    ))}
                </ol>
            </section>

            <Stages />

            <Questions id="questions" title="Three questions, answered" items={homeQuestions} gap="l" />
        </div>
    );
}
