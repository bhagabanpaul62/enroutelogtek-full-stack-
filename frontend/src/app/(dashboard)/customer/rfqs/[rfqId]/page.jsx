import RfqDetailPage from '@/features/rfq/ui/customer/RfqDetailPage';

export const metadata = { title: 'RFQ' };

export default async function Page({ params }) {
    const { rfqId } = await params;
    return <RfqDetailPage rfqId={rfqId} />;
}
