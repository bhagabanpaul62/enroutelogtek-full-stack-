import { ViewTransitions } from 'next-view-transitions';
import Nav from '@/shared/ui/layout/nav';
import Footer from '@/shared/ui/layout/footer';
import '@/features/marketing/styles/marketing.css';
import '@/features/auth/styles/auth.css';

function PublicLayout({ children }) {
    return (
        <ViewTransitions>
            <Nav />
            <main id="main" className="flex-1">
                {children}
            </main>
            <Footer />
        </ViewTransitions>
    );
}

export default PublicLayout;
