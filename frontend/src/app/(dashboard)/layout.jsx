import DashboardShell from '@/shared/ui/layout/DashboardShell';

// Private app screens: never indexed by search engines.
export const metadata = { robots: { index: false, follow: false } };

export default function RootLayout({ children }) {
    return <DashboardShell>{children}</DashboardShell>;
}
