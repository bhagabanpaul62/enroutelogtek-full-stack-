import DashboardOverview from '@/shared/ui/layout/DashboardOverview';

export const metadata = { title: 'Overview' };

export default function Page() {
    return <DashboardOverview companyType="fleet_owner" />;
}
