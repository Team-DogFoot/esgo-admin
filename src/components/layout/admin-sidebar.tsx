import Link from "next/link";
import { Home } from "lucide-react";
import { regions } from "@/lib/regions";
import { RegionSelector } from "@/components/layout/region-selector";
import { UserMenu } from "@/components/layout/user-menu";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { auth, signOut } from "@/lib/auth";

interface AdminSidebarProps {
  regionId: string | null;
}

export async function AdminSidebar({ regionId }: AdminSidebarProps) {
  const session = await auth();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Home className="h-5 w-5" />
          ESGo Admin
        </Link>
      </div>

      <div className="border-b px-3 py-3">
        <RegionSelector regions={regions} currentRegionId={regionId} />
      </div>

      {regionId && <SidebarNav regionId={regionId} />}

      <div className="mt-auto border-t px-3 py-3">
        {session?.user && (
          <UserMenu
            name={session.user.name ?? "Admin"}
            email={session.user.email ?? ""}
            image={session.user.image}
            signOutAction={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          />
        )}
      </div>
    </aside>
  );
}
