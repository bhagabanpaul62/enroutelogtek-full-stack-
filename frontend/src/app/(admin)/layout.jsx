import AuthGuard from '@/shared/guards/guard';
import RoleGuard from '@/shared/guards/roleGuard';
import AdminShell from '@/features/platform/ui/AdminShell';

// Private admin screens: never indexed by search engines.
export const metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }) {
    return (
        <AuthGuard>
            <RoleGuard allowedRoles={['root_admin']}>
                <AdminShell>{children}</AdminShell>
            </RoleGuard>
        </AuthGuard>
    );
}
