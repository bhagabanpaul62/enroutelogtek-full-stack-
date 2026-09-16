import React from 'react';
import { ViewTransitions } from 'next-view-transitions';
import Nav from '@/shared/ui/layout/nav';
import Footer from '@/shared/ui/layout/footer';

function layout({ children }) {
    return (
        <>
            <ViewTransitions>
                <Nav />

                <main className="flex-1">{children}</main>

                <Footer />
            </ViewTransitions>
        </>
    );
}

export default layout;
