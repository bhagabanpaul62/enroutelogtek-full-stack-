import ClosureSheetPage from '@/features/trips/ui/ClosureSheetPage';

export const metadata = { title: 'Closure sheet' };

export default async function Page({ params }) {
    const { tripId } = await params;
    return <ClosureSheetPage tripId={tripId} />;
}
