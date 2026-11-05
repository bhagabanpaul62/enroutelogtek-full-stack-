import Link from 'next/link';

const links = [
    { name: 'Solution', href: '/solution' },
    { name: 'About', href: '/about' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Support', href: '/support' },
    { name: 'Log in', href: '/login' },
];

// Statement footer: the close is the site's one action, then the real links and the legal line.
function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="mk mk-footer">
            <div className="container">
                <div className="mk-footer__close">
                    <p className="mk-footer__statement">
                        Register your company. A person checks the papers before anyone logs in.
                    </p>
                    <Link className="mk-btn mk-btn--primary" href="/register">
                        Register your company
                    </Link>
                </div>

                <div className="mk-footer__foot">
                    <nav aria-label="Footer">
                        <ul className="mk-footer__links">
                            {links.map((item) => (
                                <li key={item.href}>
                                    <Link href={item.href}>{item.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div className="mk-footer__legal">
                        <small>© {year} EnrouteLogtek</small>
                        <small>
                            <a href="mailto:hello@enroutelogtek.in">hello@enroutelogtek.in</a>
                        </small>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
