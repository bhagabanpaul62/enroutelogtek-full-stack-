import PartnerDetailPage from '@/features/allocation/ui/PartnerDetailPage';

export const metadata = { title: 'Transporter' };

export default async function Page({ params }) {
    const { companyId } = await params;
    return <PartnerDetailPage type="transporter" companyId={companyId} />;
}
