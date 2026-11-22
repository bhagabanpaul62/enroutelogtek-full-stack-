import { Fragment } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Clock, FileCheck, MapPin, ShieldCheck, Truck } from 'lucide-react';
import JsonLd from './parts/JsonLd';
import Questions from './parts/Questions';
import InView from './parts/InView';
import ModuleRail from './parts/ModuleRail';
import CountUp from './parts/CountUp';
import { HeroTitle, HeroTruck, Item, MotionRoot, Reveal, ScrollSection, Stagger } from './parts/Motion';
import { Cartons, DotGlobe, HangingContainer, RoleArt, TruckSide } from './parts/HomeArt';
import ModuleScene from './parts/ModuleScenes';
import { homeQuestions } from '../content/questions';
import '../styles/home.css';

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
                'Road transport booking for Indian companies: post a load, get prices from carriers you trust, and track every truck to delivery.',
        },
    ],
};

// Every number and promise here is a rule the product enforces (backend/src/features/*/…constants.js).
const HERO_STATS = [
    [12, 'h', 'Prices come in', 'by default'],
    [5, '', 'Prices per carrier', 'for each load'],
    [14, 'd', 'Free to start', 'once approved'],
];

const WHY = [
    [Clock, 'Prices in hours', 'Post a load and the carriers you work with send their prices before the time runs out.'],
    [ShieldCheck, 'Checked companies', 'A person checks every company’s GST and PAN papers before it can join.'],
    [MapPin, 'Every step, in one view', 'Truck reached, loaded, on the road, delivered. Each step shows as it is updated.'],
    [FileCheck, 'Proof kept safe', 'The delivery photo and the final charges stay saved with the trip.'],
];

const STEPS = [
    ['Post your load', 'Pickup, drop, what you are sending and the truck you need.'],
    ['Get prices', 'Carriers you work with send their prices. They never see your budget.'],
    ['Pick one and track it', 'Choose a carrier, follow the trip, and get the delivery photo at the end.'],
];

const MODULES = [
    {
        id: 'm-loads',
        n: '01',
        label: 'One-off loads',
        kind: 'loads',
        title: 'Need a truck this week? Post the load.',
        body: 'Add pickup, drop, goods and truck type. Carriers send their prices, and you pick the one that suits you.',
    },
    {
        id: 'm-routes',
        n: '02',
        label: 'Regular routes',
        kind: 'routes',
        title: 'Same route every week? Fix the price once.',
        body: 'Agree prices for your regular routes for a season, then order trucks against them day by day.',
    },
    {
        id: 'm-trips',
        n: '03',
        label: 'Live trips',
        kind: 'trips',
        title: 'Know where every truck stands.',
        body: 'See each step from the truck reaching your gate to the goods being delivered, with the charges settled at the end.',
    },
    {
        id: 'm-network',
        n: '04',
        label: 'Your network',
        kind: 'network',
        title: 'Work only with people you trust.',
        body: 'Find transport companies, brokers and truck owners by name. Both sides say yes before any work starts.',
    },
];

const RULES = [
    [12, 'hours', 'Default time for carriers to send prices. You can choose 2, 6, 12 or 24.'],
    [5, 'prices', 'The most one carrier can send for a single load.'],
    [24, 'hours', 'For the chosen carrier to confirm the job.'],
    [14, 'days', 'Free, counted from the day your company is approved.'],
];

const ROLES = [
    { kind: 'shipper', name: 'Companies sending goods', line: 'Post loads, compare prices, track deliveries and approve the final bill.' },
    { kind: 'transporter', name: 'Transport companies', line: 'Get loads from your customers, send prices, and put your trucks and drivers on the job.' },
    { kind: 'broker', name: 'Brokers', line: 'Take loads from transport companies and pass them to truck owners you know.' },
    { kind: 'fleet', name: 'Truck owners', line: 'Take trips for your trucks, assign drivers and see what each trip earned.' },
];

export default function HomePage() {
    return (
        <MotionRoot>
        <div className="mk mk-page hm">
            <JsonLd data={structuredData} />

            {/* Hero: headline left, counters right, the truck driving in across the middle */}
            <section className="hm-frame container hm-hero" aria-labelledby="hero-title">
                <div className="hm-hero__top">
                    <div>
                        <p className="hm-kicker">
                            <span className="hm-kicker__icon">
                                <Truck size={14} aria-hidden="true" />
                            </span>
                            Road transport for India
                        </p>
                        <HeroTitle
                            id="hero-title"
                            lines={[
                                'Book trucks,',
                                <Fragment key="line-2">
                                    <em>track</em> loads.
                                </Fragment>,
                            ]}
                        />
                    </div>
                    <Stagger as="dl" onLoad delay={0.35} className="hm-hero__stats">
                        {HERO_STATS.map(([value, unit, label, sub]) => (
                            <Item key={label}>
                                <dt>
                                    <CountUp to={value} />
                                    <span className="hm-unit">{unit}</span>
                                </dt>
                                <dd>
                                    {label}
                                    <br />
                                    {sub}
                                </dd>
                            </Item>
                        ))}
                    </Stagger>
                </div>

                <div className="hm-stage">
                    <div className="hm-stage__actions">
                        <Link className="mk-btn mk-btn--primary" href="/register">
                            Register free <ArrowUpRight size={16} aria-hidden="true" />
                        </Link>
                        <a className="hm-link" href="#how">
                            How it works <ArrowRight size={16} aria-hidden="true" />
                        </a>
                    </div>

                    <Stagger onLoad delay={1.5} gap={0.2} className="hm-stage__truck">
                        <HeroTruck>
                            <TruckSide className="hm-hero-truck" title="An EnrouteLogtek truck" />
                        </HeroTruck>
                        <Item as="span" className="hm-tag hm-tag--gold" style={{ left: '68%', top: '4%' }}>
                            Live trip status
                        </Item>
                        <Item as="span" className="hm-tag" style={{ left: '44%', top: '58%' }}>
                            Prices in hours
                        </Item>
                        <Item as="span" className="hm-tag" style={{ left: '12%', top: '0%' }}>
                            Checked carriers
                        </Item>
                    </Stagger>

                    <div className="hm-card hm-card--boxes">
                        <Cartons />
                        <div>
                            <p>See every step of every trip, as it happens.</p>
                            <a className="hm-card__btn" href="#m-trips">
                                <span>See a live trip</span>
                                <ArrowUpRight size={16} aria-hidden="true" />
                            </a>
                        </div>
                    </div>

                    <div className="hm-stage__side">
                        <p className="hm-mono">
                            For senders, transport companies,
                            <br />
                            brokers and truck owners
                        </p>
                        <div className="hm-card hm-card--globe">
                            <p>Every company checked by a person</p>
                            <strong>GST + PAN</strong>
                            <DotGlobe />
                        </div>
                    </div>
                </div>
            </section>

            {/* Why: four plain reasons */}
            <section className="hm-frame container hm-block" aria-labelledby="why-title">
                <Reveal className="hm-head hm-head--split">
                    <div>
                        <p className="hm-mono">Why EnrouteLogtek</p>
                        <h2 id="why-title">Fewer phone calls. More loads moved.</h2>
                    </div>
                    <p>
                        Today a load goes out on WhatsApp, prices come back by phone, and the delivery
                        proof turns up a week later. Here it all sits in one place.
                    </p>
                </Reveal>
                <Stagger as="ul" className="hm-why">
                    {WHY.map(([Icon, title, line]) => (
                        <Item as="li" key={title}>
                            <span className="hm-why__icon">
                                <Icon size={20} aria-hidden="true" />
                            </span>
                            <h3>{title}</h3>
                            <p>{line}</p>
                        </Item>
                    ))}
                </Stagger>
            </section>

            {/* How: a truck drives the route as you scroll, lighting each step it passes */}
            <ScrollSection id="how" className="hm-frame container hm-block hm-how" aria-labelledby="how-title">
                <Reveal className="hm-head">
                    <p className="hm-mono">How it works</p>
                    <h2 id="how-title">Three steps from load to delivery</h2>
                </Reveal>
                <div className="hm-road" aria-hidden="true">
                    <div className="hm-road__line" />
                    <div className="hm-road__truck">
                        <TruckSide />
                    </div>
                </div>
                <ol className="hm-steps">
                    {STEPS.map(([title, line], i) => (
                        <li key={title} style={{ '--at': (0.12 + i * 0.3).toFixed(2) }}>
                            <span className="hm-steps__n">0{i + 1}</span>
                            <h3>{title}</h3>
                            <p>{line}</p>
                        </li>
                    ))}
                </ol>
            </ScrollSection>

            {/* What you can do: sticky list beside four panels */}
            <section className="hm-frame container hm-modules" aria-labelledby="modules-title">
                <h2 id="modules-title" className="visually-hidden">
                    What you can do
                </h2>
                <ModuleRail items={MODULES} />
                <div className="hm-panels">
                    {MODULES.map((m) => (
                        <InView
                            as="article"
                            key={m.id}
                            id={m.id}
                            className="hm-panel"
                            once={false}
                            threshold={0.35}
                            aria-labelledby={`${m.id}-title`}
                        >
                            <p className="hm-mono">
                                {m.n} / {m.label}
                            </p>
                            <h3 id={`${m.id}-title`}>{m.title}</h3>
                            <p className="hm-panel__body">{m.body}</p>
                            <ModuleScene kind={m.kind} />
                        </InView>
                    ))}
                </div>
            </section>

            {/* The rules, on the one gold band of the page */}
            <section className="hm-band" aria-labelledby="rules-title">
                <div className="container hm-band__inner">
                    <HangingContainer />
                    <Reveal className="hm-head">
                        <p className="hm-mono">Built-in time limits</p>
                        <h2 id="rules-title">No chasing on the phone. The clock runs itself.</h2>
                    </Reveal>
                    <Stagger as="dl" className="hm-rules">
                        {RULES.map(([value, unit, line]) => (
                            <Item key={line}>
                                <dt>
                                    <CountUp to={value} />
                                    <small>{unit}</small>
                                </dt>
                                <dd>{line}</dd>
                            </Item>
                        ))}
                    </Stagger>
                </div>
            </section>

            {/* Who it is for */}
            <section className="hm-frame container hm-block" aria-labelledby="roles-title">
                <Reveal className="hm-head">
                    <p className="hm-mono">Who it is for</p>
                    <h2 id="roles-title">Four kinds of company, one network</h2>
                </Reveal>
                <Stagger as="ul" className="hm-roles">
                    {ROLES.map((r) => (
                        <Item as="li" key={r.kind}>
                            <Link className="hm-role" href="/solution">
                                <RoleArt kind={r.kind} />
                                <span className="hm-role__name">{r.name}</span>
                                <span className="hm-role__line">{r.line}</span>
                                <span className="hm-role__go" aria-hidden="true">→</span>
                            </Link>
                        </Item>
                    ))}
                </Stagger>
            </section>

            <Reveal className="hm-frame container hm-faq">
                <Questions id="questions" title="Questions people ask" items={homeQuestions} gap="s" />
            </Reveal>
        </div>
        </MotionRoot>
    );
}
