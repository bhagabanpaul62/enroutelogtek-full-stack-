import Link from 'next/link';
import Nav from '@/shared/ui/layout/nav';
import Footer from '@/shared/ui/layout/footer';
import '@/features/marketing/styles/marketing.css';

// Root 404: catches every unmatched URL. It sits outside the (public) route group, so it brings
// the marketing nav, styles and footer itself.
export const metadata = {
    title: 'Page not found',
    robots: { index: false, follow: false },
};

export default function NotFound() {
    return (
        <>
            <Nav />
            <main id="main" className="flex-1">
                <div className="mk mk-page">
                    <header className="container mk-banner">
                        <h1>There is no page here.</h1>
                        <div className="mk-banner__side">
                            <p className="lead">
                                The address may be mistyped, or the page has moved. The site and
                                your dashboard are each one step away.
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                <Link className="mk-btn mk-btn--primary" href="/">
                                    Back to the site
                                </Link>
                                <Link className="mk-btn" href="/login">
                                    Log in
                                </Link>
                            </div>
                        </div>
                    </header>
                </div>
            </main>
            <Footer />
        </>
    );
}
