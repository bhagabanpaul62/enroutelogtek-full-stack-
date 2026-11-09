import BidDetailPage from '@/features/loads/ui/transporter/BidDetailPage';

export const metadata = { title: 'Bid' };

export default async function Page({ params }) {
    const { loadId } = await params;
    return <BidDetailPage loadId={loadId} />;
}
