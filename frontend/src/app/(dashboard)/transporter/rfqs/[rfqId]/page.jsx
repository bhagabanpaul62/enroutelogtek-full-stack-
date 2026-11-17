import TransporterRfqDetailPage from '@/features/rfq/ui/transporter/TransporterRfqDetailPage';

export const metadata = { title: 'RFQ' };

export default async function Page({ params }) {
    const { rfqId } = await params;
    return <TransporterRfqDetailPage rfqId={rfqId} />;
}
