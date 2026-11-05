import Link from 'next/link';
import Questions from './parts/Questions';

// Licensing facts come from the product; the plan names from the business plan. Prices are not
// known yet, so the page says so in one slot rather than inventing a table.
const SEAT_RULES = [
    { q: 'One login per person', a: 'Licences are per seat; nobody shares a password.' },
    { q: 'One device at a time', a: 'A login is active on one device at a time.' },
    { q: 'Six roles', a: 'Admin, co-admin, viewer, bid manager, trip manager, accounts.' },
    { q: 'One type per company', a: 'Shipper, transporter, broker or fleet owner; not several.' },
];

const PLAN_QUESTIONS = [
    { q: 'Can I register before choosing a plan?', a: 'Yes. Registration has no plan step; plans are chosen later.' },
    {
        q: 'How do I get a price?',
        a: 'Write to hello@enroutelogtek.in with your company type and seat count.',
    },
];

export default function PricingPage() {
    return (
        <div className="mk mk-page">
            <header className="container mk-banner">
                <h1>Licensed per seat, in four plans.</h1>
                <div className="mk-banner__side">
                    <p className="lead">
                        Starter, Pro, Enterprise or Custom; every person gets their own login.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                        <Link className="mk-btn mk-btn--primary" href="/register">
                            Register your company
                        </Link>
                        <a className="mk-btn" href="mailto:hello@enroutelogtek.in?subject=Pricing">
                            Ask for a quote
                        </a>
                    </div>
                    <p className="mk-caption">
                        Seat counts and prices:{' '}
                        <span className="fill" data-fill="prices">
                            to be announced
                        </span>
                        .
                    </p>
                </div>
            </header>

            <Questions id="seats" title="How a seat works" items={SEAT_RULES} gap="s" />

            <Questions id="plan-questions" title="Before you ask" items={PLAN_QUESTIONS} />
        </div>
    );
}
