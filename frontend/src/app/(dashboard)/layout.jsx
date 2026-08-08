import AuthGuard from "@/shared/guards/guard";

export default function RootLayout({ children }) {
  return (
      <div className="text-white">
          <AuthGuard>{children}</AuthGuard>
      </div>
  );
}
