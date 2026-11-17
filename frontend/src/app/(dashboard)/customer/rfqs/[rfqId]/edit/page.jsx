import RfqWizard from '@/features/rfq/ui/customer/RfqWizard';

export const metadata = { title: 'Edit RFQ' };

export default async function Page({ params }) {
    const { rfqId } = await params;
    return <RfqWizard rfqId={rfqId} />;
}
