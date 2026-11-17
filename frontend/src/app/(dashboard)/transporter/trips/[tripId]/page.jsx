import TripRecordPage from '@/features/trips/ui/TripRecordPage';

export const metadata = { title: 'Trip' };

export default async function Page({ params }) {
    const { tripId } = await params;
    return <TripRecordPage tripId={tripId} />;
}
