import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="mk mk-page">
            <header className="container mk-banner">
                <h1>Indian freight, from RFQ to delivery.</h1>
                <div className="mk-banner__side">
                    <p className="lead">
                        Where manufacturers and the carriers that move their goods meet and bid.
                    </p>
                    <Link className="mk-btn mk-btn--primary" href="/register">
                        Register your company
                    </Link>
                </div>
            </header>

            <section className="container mk-section--s" aria-labelledby="for-title">
                <div className="mk-head">
                    <h2 id="for-title">Built for four kinds of company</h2>
                    <p className="lead">One type per company, chosen at registration.</p>
                </div>
                <ul className="mk-four" style={{ marginTop: 'var(--space-2xl)' }}>
                    <li>
                        <b>Manufacturers and shippers</b>
                        <p>Have loads to move and put them out to bid.</p>
                    </li>
                    <li>
                        <b>Transporters</b>
                        <p>Bid on those loads and run the trips.</p>
                    </li>
                    <li>
                        <b>Brokers</b>
                        <p>Arrange trucks between shippers and the fleets.</p>
                    </li>
                    <li>
                        <b>Fleet owners</b>
                        <p>Put their vehicles and drivers on trips.</p>
                    </li>
                </ul>
            </section>

            <section className="container mk-section" aria-labelledby="where-title">
                <div className="mk-qa">
                    <div className="mk-head">
                        <h2 id="where-title">Where we are</h2>
                    </div>
                    <dl>
                        <div>
                            <dt>Based in</dt>
                            <dd>
                                <span className="fill" data-fill="city">
                                    City to be added
                                </span>
                                , India
                            </dd>
                        </div>
                        <div>
                            <dt>Founded</dt>
                            <dd>
                                <span className="fill" data-fill="founded">
                                    Year to be added
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt>The line</dt>
                            <dd>Smarter logistics. Stronger future.</dd>
                        </div>
                        <div>
                            <dt>Write to</dt>
                            <dd>
                                <a href="mailto:hello@enroutelogtek.in">hello@enroutelogtek.in</a>
                            </dd>
                        </div>
                    </dl>
                </div>
            </section>
        </div>
    );
}
