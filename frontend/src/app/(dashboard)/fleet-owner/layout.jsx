import CompanyTypeGuard from '@/shared/guards/companyTypeGuard';

export default function Layout({ children }) {
    return <CompanyTypeGuard companyType="fleet_owner">{children}</CompanyTypeGuard>;
}
