'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import icon from '../../../../public/icon.png';
import { useNav } from '@/shared/hooks/useNav';
import { dashboardPath } from '@/shared/lib/companyType';

const navLinks = [
    { name: 'Solution', href: '/solution' },
    { name: 'About', href: '/about' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Support', href: '/support' },
];

// Public site nav: one bar, the wordmark at one edge, the four pages, one action at the other.
function Nav() {
    const { user, isLoggedIn } = useNav();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const links = navLinks.map((item) => (
        <li key={item.href}>
            <Link
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                onClick={() => setIsOpen(false)}
            >
                {item.name}
            </Link>
        </li>
    ));

    const actions = isLoggedIn ? (
        <Link className="mk-btn mk-btn--quiet" href={dashboardPath(user.companyType)}>
            Open dashboard
        </Link>
    ) : (
        <Link className="mk-btn mk-btn--quiet" href="/login">
            Log in
        </Link>
    );

    return (
        <nav className="mk mk-nav" aria-label="Site">
            <a className="skip" href="#main">
                Skip to content
            </a>
            <div className="container mk-nav__row">
                <Link href="/" className="mk-nav__brand" aria-label="EnrouteLogtek home">
                    <Image src={icon} alt="" width={32} height={32} priority />
                    <span>EnrouteLogtek</span>
                </Link>

                <ul className="mk-nav__links">{links}</ul>

                <div className="mk-nav__actions">{actions}</div>

                <button
                    type="button"
                    className="mk-nav__toggle"
                    aria-expanded={isOpen}
                    aria-controls="mk-nav-menu"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                    <span>{isOpen ? 'Close' : 'Menu'}</span>
                </button>
            </div>

            <div id="mk-nav-menu" className="mk-nav__menu" hidden={!isOpen}>
                <div className="container">
                    <ul className="mk-nav__menu-links">{links}</ul>
                    <div className="mk-nav__menu-actions">{actions}</div>
                </div>
            </div>
        </nav>
    );
}

export default Nav;
