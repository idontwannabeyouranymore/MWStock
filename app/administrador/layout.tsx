import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-neutral-950">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}