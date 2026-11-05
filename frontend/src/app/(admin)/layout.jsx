import AuthGuard from "@/shared/guards/guard";
import RoleGuard from "@/shared/guards/roleGuard";

// Private admin screens: never indexed by search engines.
export const metadata = { robots: { index: false, follow: false } };

export default function RootLayout({ children }) {
  return (
      <div className="text-white">
          <AuthGuard>
              <RoleGuard allowedRoles={['root_admin']}>{children}</RoleGuard>
          </AuthGuard>
      </div>
  );
}
