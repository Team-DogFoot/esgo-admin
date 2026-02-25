import Link from "next/link";
import { BarChart3, Building2, Users, Activity, Home, CreditCard } from "lucide-react";
import { regions } from "@/lib/regions";
import { RegionSelector } from "@/components/layout/region-selector";
import { UserMenu } from "@/components/layout/user-menu";
import { auth, signOut } from "@/lib/auth";

interface AdminSidebarProps {
  regionId: string | null;
}

const NAV_ITEMS = [
  { label: "대시보드", href: "", icon: BarChart3 },
  { label: "워크스페이스", href: "/workspaces", icon: Building2 },
  { label: "사용자", href: "/users", icon: Users },
  { label: "빌링", href: "/billing", icon: CreditCard },
  { label: "AI 모니터", href: "/ai-monitor", icon: Activity },
];

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

      {regionId && (
        <nav className="flex-1 space-y-1 px-3 py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={`/${regionId}${item.href}`}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      )}

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
