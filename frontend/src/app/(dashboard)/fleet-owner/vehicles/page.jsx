import VehiclesPage from '@/features/fleet/ui/VehiclesPage';

export const metadata = { title: 'Vehicles' };

export default function Page() {
    return <VehiclesPage basePath="/fleet-owner/vehicles" />;
}
