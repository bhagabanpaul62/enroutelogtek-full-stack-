import ContractDetailPage from '@/features/contracts/ui/ContractDetailPage';

export const metadata = { title: 'Contract' };

export default async function Page({ params }) {
    const { contractId } = await params;
    return <ContractDetailPage side="customer" contractId={contractId} />;
}
