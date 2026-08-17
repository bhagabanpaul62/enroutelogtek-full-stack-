import AuthGuard from '@/shared/guards/guard';
import NavBarForDashboard from '@/shared/ui/layout/navBarFor/navBarForDashboard';
import SidenavBarDashboard from '@/shared/ui/layout/sidenavBarDsahbord';

export default function RootLayout({ children }) {
    return (
        <div className="min-h-screen bg-black text-white">
            <AuthGuard>
                <div className="flex min-h-screen">
                    {/* Sidebar */}
                    <SidenavBarDashboard />

                    {/* Main Content */}
                    <main className="flex-1 min-w-0">
                        <NavBarForDashboard />
                        {children}
                    </main>
                </div>
            </AuthGuard>
        </div>
    );
}
