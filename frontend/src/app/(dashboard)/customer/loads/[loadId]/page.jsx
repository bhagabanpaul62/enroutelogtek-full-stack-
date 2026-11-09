import LoadDetailPage from '@/features/loads/ui/customer/LoadDetailPage';

export const metadata = { title: 'Load' };

export default async function Page({ params }) {
    const { loadId } = await params;
    return <LoadDetailPage loadId={loadId} />;
}
