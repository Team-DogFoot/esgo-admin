"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Users,
  Activity,
  CreditCard,
  FolderOpen,
  ChevronDown,
  Receipt,
  Coins,
  ListChecks,
  PieChart,
  FileText,
  Database,
  FileBarChart,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { LucideIcon } from "lucide-react";

interface NavChild {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "대시보드", href: "", icon: BarChart3 },
  { label: "워크스페이스", href: "/workspaces", icon: Building2 },
  { label: "사용자", href: "/users", icon: Users },
  {
    label: "빌링",
    href: "/billing",
    icon: CreditCard,
    children: [
      { label: "대시보드", href: "/billing", icon: PieChart },
      { label: "구독", href: "/billing/subscriptions", icon: ListChecks },
      { label: "결제", href: "/billing/payments", icon: Receipt },
      { label: "크레딧", href: "/billing/credits", icon: Coins },
    ],
  },
  {
    label: "AI 모니터",
    href: "/ai-monitor",
    icon: Activity,
    children: [
      { label: "대시보드", href: "/ai-monitor", icon: PieChart },
      { label: "파이프라인", href: "/ai-monitor/pipelines", icon: ListChecks },
      { label: "크레딧 분석", href: "/ai-monitor/credits", icon: Coins },
    ],
  },
  {
    label: "콘텐츠",
    href: "/content",
    icon: FolderOpen,
    children: [
      { label: "대시보드", href: "/content", icon: PieChart },
      { label: "문서", href: "/content/documents", icon: FileText },
      { label: "ESG 데이터", href: "/content/esg-data", icon: Database },
      { label: "리포트", href: "/content/reports", icon: FileBarChart },
    ],
  },
];

interface SidebarNavProps {
  regionId: string;
}

export function SidebarNav({ regionId }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    const fullHref = `/${regionId}${href}`;
    if (href === "") return pathname === `/${regionId}`;
    return pathname === fullHref || pathname.startsWith(`${fullHref}/`);
  };

  const isCategoryActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => isActive(child.href));
    }
    return isActive(item.href);
  };

  const linkClasses = (href: string) =>
    `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
      isActive(href)
        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`;

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
      {NAV_ITEMS.map((item) =>
        item.children ? (
          <CollapsibleNavItem
            key={item.href}
            item={item}
            regionId={regionId}
            defaultOpen={isCategoryActive(item)}
            linkClasses={linkClasses}
          />
        ) : (
          <Link
            key={item.href}
            href={`/${regionId}${item.href}`}
            className={linkClasses(item.href)}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}

interface CollapsibleNavItemProps {
  item: NavItem;
  regionId: string;
  defaultOpen: boolean;
  linkClasses: (href: string) => string;
}

function CollapsibleNavItem({
  item,
  regionId,
  defaultOpen,
  linkClasses,
}: CollapsibleNavItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [prevDefaultOpen, setPrevDefaultOpen] = useState(defaultOpen);

  if (defaultOpen !== prevDefaultOpen) {
    setPrevDefaultOpen(defaultOpen);
    setOpen(defaultOpen);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
          defaultOpen
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
      >
        <item.icon className="h-4 w-4" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-4 space-y-0.5 pt-0.5">
        {item.children?.map((child) => (
          <Link
            key={child.href}
            href={`/${regionId}${child.href}`}
            className={linkClasses(child.href)}
          >
            <child.icon className="h-3.5 w-3.5" />
            {child.label}
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
