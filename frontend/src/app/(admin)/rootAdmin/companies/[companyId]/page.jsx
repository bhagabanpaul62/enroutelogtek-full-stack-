import CompanyDetailPage from '@/features/platform/ui/CompanyDetailPage';

export const metadata = { title: 'Company' };

export default async function Page({ params }) {
    const { companyId } = await params;
    return <CompanyDetailPage companyId={companyId} />;
}
