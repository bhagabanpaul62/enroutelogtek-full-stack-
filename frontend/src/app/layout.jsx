import { Space_Grotesk, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import ReduxProvider from '@/shared/store/reduxProvider';

const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-space-grotesk',
    display: 'swap',
});

// Used by the marketing pages for every figure that measures something (IDs, times, prices).
const geistMono = Geist_Mono({
    subsets: ['latin'],
    weight: ['400'],
    variable: '--font-geist-mono',
    display: 'swap',
});

const SITE_URL = 'https://enroutelogtek.in';

export const metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: 'EnrouteLogtek: freight procurement for shippers and carriers',
        template: '%s | EnrouteLogtek',
    },
    description:
        'EnrouteLogtek is a logistics procurement and transport management platform for Indian manufacturers, transporters, brokers and fleet owners: register, build a verified network, post RFQs, take bids and track trips.',
    applicationName: 'EnrouteLogtek',
    keywords: [
        'logistics procurement',
        'transport management system',
        'freight RFQ',
        'truck bidding platform',
        'transporter network India',
    ],
    openGraph: {
        type: 'website',
        siteName: 'EnrouteLogtek',
        locale: 'en_IN',
        url: SITE_URL,
        images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'EnrouteLogtek' }],
    },
    twitter: {
        card: 'summary_large_image',
        images: ['/opengraph-image'],
    },
    robots: {
        index: true,
        follow: true,
    },
    icons: {
        icon: '/icon.png',
        apple: '/icon.png',
    },
};

export default function RootLayout({ children }) {
    return (
        <html
            lang="en"
            className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col bg-background">
                <ReduxProvider>{children}</ReduxProvider>
                <Toaster richColors position="bottom-right" />
            </body>
        </html>
    );
}
