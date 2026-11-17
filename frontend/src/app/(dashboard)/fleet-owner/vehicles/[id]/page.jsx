import VehicleDetailPage from '@/features/fleet/ui/VehicleDetailPage';

export const metadata = { title: 'Vehicle' };

export default function PageDetail() {
    return <VehicleDetailPage basePath="/fleet-owner/vehicles" />;
}
