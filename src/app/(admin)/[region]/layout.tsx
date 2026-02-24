import { AdminSidebar } from "@/components/layout/admin-sidebar";

interface RegionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ region: string }>;
}

export default async function RegionLayout({ children, params }: RegionLayoutProps) {
  const { region } = await params;

  return (
    <div className="flex min-h-screen">
      <AdminSidebar regionId={region} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
