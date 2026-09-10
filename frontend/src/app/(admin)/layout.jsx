import AuthGuard from "@/shared/guards/guard";
import RoleGuard from "@/shared/guards/roleGuard";

export default function RootLayout({ children }) {
  return (
      <div className="text-white">
          <AuthGuard>
              <RoleGuard allowedRoles={['root_admin']}>{children}</RoleGuard>
          </AuthGuard>
      </div>
  );
}
