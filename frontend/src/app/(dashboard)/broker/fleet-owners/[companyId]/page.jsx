import PartnerDetailPage from '@/features/allocation/ui/PartnerDetailPage';

export const metadata = { title: 'Fleet owner' };

export default async function Page({ params }) {
    const { companyId } = await params;
    return <PartnerDetailPage type="fleet_owner" companyId={companyId} />;
}
