# ESGo Admin 기능 확장 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ESGo Admin에 빌링/구독, AI 파이프라인 모니터링, 사용자/워크스페이스 심화, 콘텐츠/데이터 관리 4개 영역을 production급 퀄리티로 추가한다.

**Architecture:** 기존 Next.js 16 App Router 구조를 그대로 확장. 모든 데이터는 서버 사이드에서 Prisma로 조회하고, 차트/인터랙션만 클라이언트 컴포넌트로 분리. 페이지네이션/필터/정렬은 URL 파라미터 기반 서버 사이드 처리. Recharts를 차트 라이브러리로 신규 도입.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind 4, shadcn/ui, Prisma 7, Recharts, Pino, Zod 4

**설계 문서:** `docs/plans/2026-02-25-admin-features-design.md`

**참고 — 기존 코드 패턴:**
- 서버 액션: `src/actions/{domain}/{action-name}.ts` — `ActionResult<T>` 패턴, Pino logger child, getRegion 검증
- 페이지: `src/app/(admin)/[region]/{route}/page.tsx` — Server Component, `params: Promise<>`, getRegion 검증 후 redirect
- 컴포넌트: `src/components/{domain}/{name}.tsx` — named export, Props interface
- 클라이언트 컴포넌트: `"use client"`, useState + useTransition + useCallback
- 로딩: `loading.tsx` — animate-pulse 스켈레톤
- UI: shadcn/ui (Card, Badge, Table, Button, Select, Input, Dialog, Label, Textarea)
- 배지 컬러: `Record<string, string>` 상수 + `Badge className={MAP[key]}` 패턴

---

### Task 1: 사전 작업 — Prisma 스키마 동기화 + Recharts 설치 + 공통 유틸리티

**Files:**
- Modify: `prisma/kr/schema.prisma` (db pull로 자동 갱신)
- Create: `src/lib/format.ts`
- Modify: `src/actions/workspace/change-plan.ts`
- Modify: `src/components/workspace/plan-change-form.tsx`
- Modify: `src/components/workspace/workspace-detail.tsx`
- Modify: `src/components/workspace/workspace-table.tsx`

**Step 1: Prisma 스키마 동기화**

Platform에서 PlanCode enum이 변경되었으므로 동기화한다.

Run: `cd /Users/kkh/works/dog-foot/esgo/esgo-admin && npm run db:pull:kr`
Expected: `prisma/kr/schema.prisma`에서 PlanCode가 `FREE | STANDARD | PRO | ENTERPRISE`로 업데이트

만약 DB 접근이 안 되면 수동으로 enum 수정:

```prisma
enum PlanCode {
  FREE
  STANDARD
  PRO
  ENTERPRISE
}
```

Run: `npm run db:generate:kr`
Expected: Prisma client 재생성 성공

**Step 2: 기존 PRO 참조를 STANDARD로 업데이트**

`src/actions/workspace/change-plan.ts`에서:
- `"FREE" | "PRO"` → `"FREE" | "STANDARD"` 타입 변경

`src/components/workspace/plan-change-form.tsx`에서:
- `planCode as "FREE" | "PRO"` → `planCode as "FREE" | "STANDARD"`
- SelectItem `value="PRO"` → `value="STANDARD"`, 텍스트 `PRO` → `STANDARD`

`src/components/workspace/workspace-detail.tsx`에서:
- `PLAN_BADGE` 상수: `PRO` → `STANDARD`

`src/components/workspace/workspace-table.tsx`에서:
- `PLAN_BADGE` 상수: `PRO` → `STANDARD`

**Step 3: Recharts 설치**

Run: `cd /Users/kkh/works/dog-foot/esgo/esgo-admin && npm install recharts`

**Step 4: 포맷팅 유틸리티 생성**

Create: `src/lib/format.ts`

```typescript
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function formatFileSize(bytes: number | bigint): string {
  const n = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "방금 전";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  return `${months}개월 전`;
}
```

**Step 5: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: 에러 0개

**Step 6: Commit**

```bash
git add prisma/kr/schema.prisma src/lib/format.ts src/actions/workspace/change-plan.ts src/components/workspace/plan-change-form.tsx src/components/workspace/workspace-detail.tsx src/components/workspace/workspace-table.tsx package.json package-lock.json
git commit -m "chore: Prisma 스키마 동기화, Recharts 설치, 포맷 유틸리티 추가, PRO→STANDARD 마이그레이션"
```

---

### Task 2: 공통 컴포넌트 — StatusBadge + Pagination + FilterBar

**Files:**
- Create: `src/components/common/status-badge.tsx`
- Create: `src/components/common/pagination.tsx`
- Create: `src/components/common/filter-bar.tsx`

**Step 1: StatusBadge 컴포넌트**

Create: `src/components/common/status-badge.tsx`

```typescript
import { Badge } from "@/components/ui/badge";

type BadgeVariant = "success" | "warning" | "error" | "info" | "default" | "muted";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  default: "bg-gray-100 text-gray-700",
  muted: "bg-muted text-muted-foreground",
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  return <Badge className={VARIANT_CLASSES[variant]}>{children}</Badge>;
}
```

**Step 2: Pagination 컴포넌트**

Create: `src/components/common/pagination.tsx`

```typescript
"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
}

export function Pagination({ page, totalPages, total }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createPageUrl = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage));
      return `${pathname}?${params.toString()}`;
    },
    [pathname, searchParams],
  );

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        총 {total.toLocaleString()}건
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => router.push(createPageUrl(page - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          이전
        </Button>
        <span className="text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => router.push(createPageUrl(page + 1))}
        >
          다음
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

**Step 3: FilterBar 컴포넌트**

Create: `src/components/common/filter-bar.tsx`

```typescript
"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterConfig[];
  searchPlaceholder?: string;
  showSearch?: boolean;
}

export function FilterBar({
  filters,
  searchPlaceholder = "검색...",
  showSearch = true,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    setSearchValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get("search") ?? "";
      if (searchValue !== current) {
        updateParam("search", searchValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, searchParams, updateParam]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {showSearch && (
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-8"
          />
        </div>
      )}
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={searchParams.get(filter.key) ?? "ALL"}
          onValueChange={(value) => updateParam(filter.key, value)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
```

**Step 4: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: 에러 0개

**Step 5: Commit**

```bash
git add src/components/common/
git commit -m "feat: 공통 컴포넌트 추가 (StatusBadge, Pagination, FilterBar)"
```

---

### Task 3: 사이드바 네비게이션 리팩터링

**Files:**
- Modify: `src/components/layout/admin-sidebar.tsx`

**Step 1: shadcn Collapsible 컴포넌트 추가**

Run: `cd /Users/kkh/works/dog-foot/esgo/esgo-admin && npx shadcn@latest add collapsible -y`

**Step 2: 사이드바 네비게이션을 Collapsible 구조로 변경**

Modify: `src/components/layout/admin-sidebar.tsx`

기존 `NAV_ITEMS` 배열을 계층 구조로 변경하고, 하위 메뉴가 있는 항목은 Collapsible로 렌더링한다. 사이드바는 Server Component이므로 네비게이션 링크 부분만 별도 Client Component로 분리한다.

`src/components/layout/admin-sidebar.tsx` 전체 교체:

```typescript
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
```

**Step 3: SidebarNav 클라이언트 컴포넌트 생성**

Create: `src/components/layout/sidebar-nav.tsx`

```typescript
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

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: { label: string; href: string; icon: LucideIcon }[];
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
            isActive={isCategoryActive(item)}
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
  isActive: boolean;
  linkClasses: (href: string) => string;
}

function CollapsibleNavItem({
  item,
  regionId,
  isActive,
  linkClasses,
}: CollapsibleNavItemProps) {
  const [open, setOpen] = useState(isActive);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
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
```

**Step 4: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: 에러 0개

**Step 5: Commit**

```bash
git add src/components/layout/admin-sidebar.tsx src/components/layout/sidebar-nav.tsx src/components/ui/collapsible.tsx
git commit -m "feat: 사이드바 네비게이션을 Collapsible 하위 메뉴 구조로 리팩터링"
```

---

### Task 4: 빌링 — 서버 액션

**Files:**
- Create: `src/actions/billing/get-billing-stats.ts`
- Create: `src/actions/billing/get-credit-consumption.ts`
- Create: `src/actions/billing/get-subscriptions.ts`
- Create: `src/actions/billing/get-payments.ts`
- Create: `src/actions/billing/get-credit-ledger.ts`

**Step 1: getBillingStats**

Create: `src/actions/billing/get-billing-stats.ts`

```typescript
"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-billing-stats" });

export interface BillingStats {
  mrr: number;
  activeSubscriptions: number;
  totalWorkspaces: number;
  conversionRate: number;
  monthlyCreditsConsumed: number;
  pendingOrFailedPayments: number;
  planDistribution: { planCode: string; count: number }[];
  recentPayments: {
    id: string;
    workspaceName: string;
    amount: number;
    type: string;
    status: string;
    paidAt: Date | null;
    createdAt: Date;
  }[];
}

export async function getBillingStats(regionId: string): Promise<ActionResult<BillingStats>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId }, "getBillingStats started");

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeSubscriptions,
      totalWorkspaces,
      monthlyCreditsAgg,
      pendingOrFailedPayments,
      planGroups,
      recentPayments,
      activePlans,
    ] = await Promise.all([
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.workspace.count(),
      prisma.creditLedger.aggregate({
        _sum: { amount: true },
        where: { type: "CONSUME", createdAt: { gte: monthStart } },
      }),
      prisma.payment.count({
        where: { status: { in: ["PENDING", "FAILED"] } },
      }),
      prisma.workspace.groupBy({
        by: ["planCode"],
        _count: { id: true },
      }),
      prisma.payment.findMany({
        include: { Workspace: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        include: { plan: { select: { monthlyPrice: true } } },
      }),
    ]);

    const mrr = activePlans.reduce((sum, sub) => sum + sub.plan.monthlyPrice, 0);
    const conversionRate =
      totalWorkspaces > 0 ? Math.round((activeSubscriptions / totalWorkspaces) * 100) : 0;

    const stats: BillingStats = {
      mrr,
      activeSubscriptions,
      totalWorkspaces,
      conversionRate,
      monthlyCreditsConsumed: Math.abs(monthlyCreditsAgg._sum.amount ?? 0),
      pendingOrFailedPayments,
      planDistribution: planGroups.map((g) => ({
        planCode: g.planCode,
        count: g._count.id,
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        workspaceName: p.Workspace.name,
        amount: p.amount,
        type: p.type,
        status: p.status,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    };

    log.info({ regionId }, "getBillingStats succeeded");
    return ok(stats);
  } catch (error) {
    log.error({ err: error, regionId }, "getBillingStats failed");
    return fail("빌링 통계 조회에 실패했습니다.");
  }
}
```

**Step 2: getCreditConsumption**

Create: `src/actions/billing/get-credit-consumption.ts`

```typescript
"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-credit-consumption" });

export interface DailyConsumption {
  date: string;
  amount: number;
}

export async function getCreditConsumption(
  regionId: string,
  days: number = 7,
): Promise<ActionResult<DailyConsumption[]>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, days }, "getCreditConsumption started");

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const ledgers = await prisma.creditLedger.findMany({
      where: { type: "CONSUME", createdAt: { gte: since } },
      select: { amount: true, createdAt: true },
    });

    const dailyMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyMap.set(d.toISOString().slice(0, 10), 0);
    }

    for (const l of ledgers) {
      const dateKey = l.createdAt.toISOString().slice(0, 10);
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + Math.abs(l.amount));
    }

    const result: DailyConsumption[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    log.info({ regionId, days, count: result.length }, "getCreditConsumption succeeded");
    return ok(result);
  } catch (error) {
    log.error({ err: error, regionId }, "getCreditConsumption failed");
    return fail("크레딧 소비 추이 조회에 실패했습니다.");
  }
}
```

**Step 3: getSubscriptions**

Create: `src/actions/billing/get-subscriptions.ts`

```typescript
"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-subscriptions" });

export interface SubscriptionListItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  planCode: string;
  planName: string;
  status: string;
  monthlyPrice: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
}

export interface PaginatedSubscriptions {
  items: SubscriptionListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const schema = z.object({
  regionId: z.string(),
  search: z.string().optional(),
  planFilter: z.string().optional(),
  statusFilter: z.string().optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
});

export async function getSubscriptions(
  input: z.infer<typeof schema>,
): Promise<ActionResult<PaginatedSubscriptions>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const region = getRegion(parsed.data.regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(parsed.data.regionId);
  log.info({ regionId: parsed.data.regionId }, "getSubscriptions started");

  try {
    const { search, planFilter, statusFilter, page, perPage } = parsed.data;

    const where: Record<string, unknown> = {};
    if (statusFilter) {
      where.status = statusFilter;
    }
    if (planFilter) {
      where.plan = { code: planFilter };
    }
    if (search) {
      where.workspace = { name: { contains: search, mode: "insensitive" } };
    }

    const [items, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          workspace: { select: { name: true } },
          plan: { select: { code: true, name: true, monthlyPrice: true } },
        },
        orderBy: { currentPeriodStart: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.subscription.count({ where }),
    ]);

    const result: PaginatedSubscriptions = {
      items: items.map((s) => ({
        id: s.id,
        workspaceId: s.workspaceId,
        workspaceName: s.workspace.name,
        planCode: s.plan.code,
        planName: s.plan.name,
        status: s.status,
        monthlyPrice: s.plan.monthlyPrice,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        canceledAt: s.canceledAt,
      })),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };

    log.info({ regionId: parsed.data.regionId, total }, "getSubscriptions succeeded");
    return ok(result);
  } catch (error) {
    log.error({ err: error, regionId: parsed.data.regionId }, "getSubscriptions failed");
    return fail("구독 목록 조회에 실패했습니다.");
  }
}
```

**Step 4: getPayments**

Create: `src/actions/billing/get-payments.ts`

```typescript
"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-payments" });

export interface PaymentListItem {
  id: string;
  workspaceName: string;
  workspaceId: string;
  amount: number;
  credits: number | null;
  type: string;
  status: string;
  portonePaymentId: string | null;
  receiptUrl: string | null;
  failReason: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface PaginatedPayments {
  items: PaymentListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const schema = z.object({
  regionId: z.string(),
  search: z.string().optional(),
  statusFilter: z.string().optional(),
  dateRange: z.enum(["this_month", "last_month", "3_months", "all"]).default("all"),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
});

export async function getPayments(
  input: z.infer<typeof schema>,
): Promise<ActionResult<PaginatedPayments>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const region = getRegion(parsed.data.regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(parsed.data.regionId);
  log.info({ regionId: parsed.data.regionId }, "getPayments started");

  try {
    const { search, statusFilter, dateRange, page, perPage } = parsed.data;

    const where: Record<string, unknown> = {};
    if (statusFilter) where.status = statusFilter;
    if (search) {
      where.Workspace = { name: { contains: search, mode: "insensitive" } };
    }

    const now = new Date();
    if (dateRange === "this_month") {
      where.createdAt = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    } else if (dateRange === "last_month") {
      where.createdAt = {
        gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        lt: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    } else if (dateRange === "3_months") {
      where.createdAt = { gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) };
    }

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { Workspace: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.payment.count({ where }),
    ]);

    const result: PaginatedPayments = {
      items: items.map((p) => ({
        id: p.id,
        workspaceName: p.Workspace.name,
        workspaceId: p.workspaceId,
        amount: p.amount,
        credits: p.credits,
        type: p.type,
        status: p.status,
        portonePaymentId: p.portonePaymentId,
        receiptUrl: p.receiptUrl,
        failReason: p.failReason,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };

    log.info({ regionId: parsed.data.regionId, total }, "getPayments succeeded");
    return ok(result);
  } catch (error) {
    log.error({ err: error, regionId: parsed.data.regionId }, "getPayments failed");
    return fail("결제 내역 조회에 실패했습니다.");
  }
}
```

**Step 5: getCreditLedger**

Create: `src/actions/billing/get-credit-ledger.ts`

```typescript
"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-credit-ledger" });

export interface CreditLedgerItem {
  id: string;
  workspaceName: string;
  workspaceId: string;
  amount: number;
  balance: number;
  type: string;
  reason: string;
  referenceId: string | null;
  createdAt: Date;
}

export interface PaginatedCreditLedger {
  items: CreditLedgerItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const schema = z.object({
  regionId: z.string(),
  search: z.string().optional(),
  typeFilter: z.string().optional(),
  dateRange: z.enum(["this_month", "last_month", "3_months", "all"]).default("all"),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
});

export async function getCreditLedger(
  input: z.infer<typeof schema>,
): Promise<ActionResult<PaginatedCreditLedger>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const region = getRegion(parsed.data.regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(parsed.data.regionId);
  log.info({ regionId: parsed.data.regionId }, "getCreditLedger started");

  try {
    const { search, typeFilter, dateRange, page, perPage } = parsed.data;

    const where: Record<string, unknown> = {};
    if (typeFilter) where.type = typeFilter;
    if (search) {
      where.workspace = { name: { contains: search, mode: "insensitive" } };
    }

    const now = new Date();
    if (dateRange === "this_month") {
      where.createdAt = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    } else if (dateRange === "last_month") {
      where.createdAt = {
        gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        lt: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    } else if (dateRange === "3_months") {
      where.createdAt = { gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) };
    }

    const [items, total] = await Promise.all([
      prisma.creditLedger.findMany({
        where,
        include: { workspace: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.creditLedger.count({ where }),
    ]);

    const result: PaginatedCreditLedger = {
      items: items.map((cl) => ({
        id: cl.id,
        workspaceName: cl.workspace.name,
        workspaceId: cl.workspaceId,
        amount: cl.amount,
        balance: cl.balance,
        type: cl.type,
        reason: cl.reason,
        referenceId: cl.referenceId,
        createdAt: cl.createdAt,
      })),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };

    log.info({ regionId: parsed.data.regionId, total }, "getCreditLedger succeeded");
    return ok(result);
  } catch (error) {
    log.error({ err: error, regionId: parsed.data.regionId }, "getCreditLedger failed");
    return fail("크레딧 원장 조회에 실패했습니다.");
  }
}
```

**Step 6: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: 에러 0개

**Step 7: Commit**

```bash
git add src/actions/billing/
git commit -m "feat: 빌링 서버 액션 5개 추가 (stats, consumption, subscriptions, payments, ledger)"
```

---

### Task 5: 빌링 — 페이지 + 컴포넌트

**Files:**
- Create: `src/app/(admin)/[region]/billing/page.tsx`
- Create: `src/app/(admin)/[region]/billing/loading.tsx`
- Create: `src/app/(admin)/[region]/billing/subscriptions/page.tsx`
- Create: `src/app/(admin)/[region]/billing/payments/page.tsx`
- Create: `src/app/(admin)/[region]/billing/credits/page.tsx`
- Create: `src/components/billing/credit-consumption-chart.tsx`
- Create: `src/components/billing/subscription-table.tsx`
- Create: `src/components/billing/payment-table.tsx`
- Create: `src/components/billing/credit-ledger-table.tsx`

**Step 1: 크레딧 소비 차트 (클라이언트 컴포넌트)**

Create: `src/components/billing/credit-consumption-chart.tsx`

```typescript
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyConsumption } from "@/actions/billing/get-credit-consumption";

interface CreditConsumptionChartProps {
  data: DailyConsumption[];
  title?: string;
}

export function CreditConsumptionChart({
  data,
  title = "최근 7일 크레딧 소비",
}: CreditConsumptionChartProps) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    amount: d.amount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), "소비 크레딧"]}
              />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: 빌링 대시보드 페이지**

Create: `src/app/(admin)/[region]/billing/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { DollarSign, CreditCard, Coins, AlertTriangle } from "lucide-react";
import { getRegion } from "@/lib/regions";
import { getBillingStats } from "@/actions/billing/get-billing-stats";
import { getCreditConsumption } from "@/actions/billing/get-credit-consumption";
import { StatCard } from "@/components/dashboard/stat-card";
import { PlanDistribution } from "@/components/dashboard/plan-distribution";
import { CreditConsumptionChart } from "@/components/billing/credit-consumption-chart";
import { StatusBadge } from "@/components/common/status-badge";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface BillingPageProps {
  params: Promise<{ region: string }>;
}

const PAYMENT_STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "default" | "muted"> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "error",
  REFUNDED: "info" as "default",
  CANCELED: "muted",
};

export default async function BillingPage({ params }: BillingPageProps) {
  const { region: regionId } = await params;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const [statsResult, consumptionResult] = await Promise.all([
    getBillingStats(regionId),
    getCreditConsumption(regionId, 7),
  ]);

  if (!statsResult.success) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {statsResult.error}
        </div>
      </div>
    );
  }

  const stats = statsResult.data;
  const consumption = consumptionResult.success ? consumptionResult.data : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">빌링 대시보드</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 매출 및 구독 현황
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="MRR"
          value={formatCurrency(stats.mrr)}
          icon={DollarSign}
          description="월간 반복 매출"
        />
        <StatCard
          title="활성 구독"
          value={`${stats.activeSubscriptions}/${stats.totalWorkspaces}`}
          icon={CreditCard}
          description={`전환율 ${stats.conversionRate}%`}
        />
        <StatCard
          title="이번 달 크레딧 소비"
          value={stats.monthlyCreditsConsumed.toLocaleString()}
          icon={Coins}
        />
        <StatCard
          title="미결제/실패"
          value={stats.pendingOrFailedPayments}
          icon={AlertTriangle}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <PlanDistribution data={stats.planDistribution} />
        <CreditConsumptionChart data={consumption} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">최근 결제</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>워크스페이스</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>일시</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.workspaceName}</TableCell>
                      <TableCell>
                        <StatusBadge variant={p.type === "SUBSCRIPTION" ? "info" : "default"}>
                          {p.type === "SUBSCRIPTION" ? "구독" : "크레딧 구매"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge variant={PAYMENT_STATUS_VARIANT[p.status] ?? "default"}>
                          {p.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(p.paidAt ?? p.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-3 text-right">
            <Link
              href={`/${regionId}/billing/payments`}
              className="text-sm text-primary hover:underline"
            >
              전체 결제 내역 →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: 빌링 로딩 상태**

Create: `src/app/(admin)/[region]/billing/loading.tsx`

```typescript
export default function BillingLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <div className="mb-3 h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: 구독 테이블 컴포넌트**

Create: `src/components/billing/subscription-table.tsx`

```typescript
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatCurrency } from "@/lib/format";
import type { SubscriptionListItem } from "@/actions/billing/get-subscriptions";

interface SubscriptionTableProps {
  subscriptions: SubscriptionListItem[];
  regionId: string;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "default" | "muted"> = {
  ACTIVE: "success",
  CANCELED: "warning",
  PAST_DUE: "error",
  EXPIRED: "muted",
};

const PLAN_VARIANT: Record<string, "info" | "default"> = {
  STANDARD: "info",
  FREE: "default",
};

export function SubscriptionTable({ subscriptions, regionId }: SubscriptionTableProps) {
  if (subscriptions.length === 0) {
    return <p className="text-sm text-muted-foreground">구독이 없습니다.</p>;
  }

  const isExpiringSoon = (date: Date) => {
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>워크스페이스</TableHead>
            <TableHead>플랜</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">월 결제액</TableHead>
            <TableHead>구독 시작</TableHead>
            <TableHead>기간 종료</TableHead>
            <TableHead>취소일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <Link
                  href={`/${regionId}/workspaces/${s.workspaceId}`}
                  className="font-medium hover:underline"
                >
                  {s.workspaceName}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge variant={PLAN_VARIANT[s.planCode] ?? "default"}>
                  {s.planCode}
                </StatusBadge>
              </TableCell>
              <TableCell>
                <StatusBadge variant={STATUS_VARIANT[s.status] ?? "default"}>
                  {s.status}
                </StatusBadge>
              </TableCell>
              <TableCell className="text-right">
                {s.monthlyPrice === 0 ? "무료" : formatCurrency(s.monthlyPrice)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(s.currentPeriodStart).toLocaleDateString("ko-KR")}
              </TableCell>
              <TableCell
                className={`text-sm ${isExpiringSoon(s.currentPeriodEnd) ? "text-red-600 font-medium" : "text-muted-foreground"}`}
              >
                {new Date(s.currentPeriodEnd).toLocaleDateString("ko-KR")}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {s.canceledAt ? new Date(s.canceledAt).toLocaleDateString("ko-KR") : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Step 5: 구독 목록 페이지**

Create: `src/app/(admin)/[region]/billing/subscriptions/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { getRegion } from "@/lib/regions";
import { getSubscriptions } from "@/actions/billing/get-subscriptions";
import { SubscriptionTable } from "@/components/billing/subscription-table";
import { FilterBar } from "@/components/common/filter-bar";
import { Pagination } from "@/components/common/pagination";

interface SubscriptionsPageProps {
  params: Promise<{ region: string }>;
  searchParams: Promise<{
    search?: string;
    plan?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function SubscriptionsPage({ params, searchParams }: SubscriptionsPageProps) {
  const { region: regionId } = await params;
  const sp = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const page = parseInt(sp.page ?? "1", 10) || 1;

  const result = await getSubscriptions({
    regionId,
    search: sp.search,
    planFilter: sp.plan,
    statusFilter: sp.status,
    page,
    perPage: 20,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">구독 관리</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 전체 구독 현황
        </p>
      </div>

      <div className="mb-4">
        <FilterBar
          searchPlaceholder="워크스페이스명 검색..."
          filters={[
            {
              key: "plan",
              label: "플랜",
              options: [
                { label: "전체", value: "ALL" },
                { label: "FREE", value: "FREE" },
                { label: "STANDARD", value: "STANDARD" },
              ],
            },
            {
              key: "status",
              label: "상태",
              options: [
                { label: "전체", value: "ALL" },
                { label: "ACTIVE", value: "ACTIVE" },
                { label: "CANCELED", value: "CANCELED" },
                { label: "PAST_DUE", value: "PAST_DUE" },
                { label: "EXPIRED", value: "EXPIRED" },
              ],
            },
          ]}
        />
      </div>

      {result.success ? (
        <>
          <SubscriptionTable subscriptions={result.data.items} regionId={regionId} />
          <Pagination
            page={result.data.page}
            totalPages={result.data.totalPages}
            total={result.data.total}
          />
        </>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {result.error}
        </div>
      )}
    </div>
  );
}
```

**Step 6: 결제 테이블 + 결제 내역 페이지, 크레딧 테이블 + 크레딧 원장 페이지**

이 4개 파일은 구독 페이지와 동일한 패턴이다. 결제 테이블(`src/components/billing/payment-table.tsx`)과 결제 페이지(`src/app/(admin)/[region]/billing/payments/page.tsx`)는 Task 4의 PaymentListItem을 사용하며, 크레딧 테이블(`src/components/billing/credit-ledger-table.tsx`)과 크레딧 페이지(`src/app/(admin)/[region]/billing/credits/page.tsx`)는 CreditLedgerItem을 사용한다.

**결제 테이블:** PaymentListItem 타입으로 table 렌더링. 상태 배지, 금액 포맷, 실패 사유 빨간 텍스트, 영수증 링크.

**결제 페이지:** 상태 필터 + 기간 필터(this_month/last_month/3_months/all) + 검색 + 페이지네이션.

**크레딧 테이블:** CreditLedgerItem 타입으로 table 렌더링. 금액 +/- 색상, 유형 배지 (6가지 CreditType).

**크레딧 페이지:** 유형 필터 + 기간 필터 + 검색 + 페이지네이션.

각 파일의 전체 코드는 위 구독 테이블/페이지 패턴을 따라 구현한다 (컬럼만 변경).

**Step 7: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: 에러 0개

**Step 8: Commit**

```bash
git add src/app/\(admin\)/\[region\]/billing/ src/components/billing/
git commit -m "feat: 빌링 대시보드, 구독/결제/크레딧 목록 페이지 + 컴포넌트"
```

---

### Task 6: AI 모니터링 — 서버 액션

**Files:**
- Create: `src/actions/ai-monitor/get-ai-stats.ts`
- Create: `src/actions/ai-monitor/get-pipelines.ts`
- Create: `src/actions/ai-monitor/get-pipeline-errors.ts`
- Create: `src/actions/ai-monitor/get-credit-by-workspace.ts`
- Create: `src/actions/ai-monitor/get-credit-by-feature.ts`

**Step 1: getAiStats**

Create: `src/actions/ai-monitor/get-ai-stats.ts`

```typescript
"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-ai-stats" });

export interface AiStats {
  todayPipelines: number;
  successRate: number;
  errorSessions: number;
  avgDurationMs: number | null;
  phaseDistribution: { phase: string; count: number }[];
}

export async function getAiStats(regionId: string): Promise<ActionResult<AiStats>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId }, "getAiStats started");

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      todayPipelines,
      totalSessions,
      completedSessions,
      errorSessions,
      durationAgg,
      phaseGroups,
    ] = await Promise.all([
      prisma.pipelineSession.count({
        where: { startedAt: { gte: todayStart } },
      }),
      prisma.pipelineSession.count(),
      prisma.pipelineSession.count({
        where: { completedAt: { not: null } },
      }),
      prisma.pipelineSession.count({
        where: { errorCount: { gt: 0 }, startedAt: { gte: weekAgo } },
      }),
      prisma.pipelineSession.aggregate({
        _avg: { durationMs: true },
        where: { completedAt: { not: null } },
      }),
      prisma.pipelineSession.groupBy({
        by: ["currentPhase"],
        _count: { id: true },
        where: { completedAt: null },
      }),
    ]);

    const successRate =
      totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    const stats: AiStats = {
      todayPipelines,
      successRate,
      errorSessions,
      avgDurationMs: durationAgg._avg.durationMs,
      phaseDistribution: phaseGroups.map((g) => ({
        phase: g.currentPhase,
        count: g._count.id,
      })),
    };

    log.info({ regionId }, "getAiStats succeeded");
    return ok(stats);
  } catch (error) {
    log.error({ err: error, regionId }, "getAiStats failed");
    return fail("AI 통계 조회에 실패했습니다.");
  }
}
```

**Step 2: getPipelines (페이지네이션 + 필터)**

Create: `src/actions/ai-monitor/get-pipelines.ts`

구독 액션과 동일 패턴. PipelineSession을 페이지네이션으로 조회. 필터: phase, status(completedAt 기반), search(워크스페이스/문서명). include: Workspace.name, Document.fileName.

**Step 3: getPipelineErrors**

Create: `src/actions/ai-monitor/get-pipeline-errors.ts`

```typescript
"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-pipeline-errors" });

export interface PipelineError {
  id: string;
  workspaceName: string;
  documentName: string;
  currentPhase: string;
  errorCount: number;
  lastError: string | null;
  startedAt: Date;
}

export async function getPipelineErrors(
  regionId: string,
  limit: number = 10,
): Promise<ActionResult<PipelineError[]>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId }, "getPipelineErrors started");

  try {
    const sessions = await prisma.pipelineSession.findMany({
      where: { errorCount: { gt: 0 } },
      include: {
        Workspace: { select: { name: true } },
        Document: { select: { fileName: true } },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    const result: PipelineError[] = sessions.map((s) => ({
      id: s.id,
      workspaceName: s.Workspace.name,
      documentName: s.Document.fileName,
      currentPhase: s.currentPhase,
      errorCount: s.errorCount,
      lastError: s.lastError,
      startedAt: s.startedAt,
    }));

    log.info({ regionId, count: result.length }, "getPipelineErrors succeeded");
    return ok(result);
  } catch (error) {
    log.error({ err: error, regionId }, "getPipelineErrors failed");
    return fail("에러 파이프라인 조회에 실패했습니다.");
  }
}
```

**Step 4: getCreditByWorkspace + getCreditByFeature**

Create: `src/actions/ai-monitor/get-credit-by-workspace.ts` — CreditLedger type=CONSUME groupBy workspace, top 10.

Create: `src/actions/ai-monitor/get-credit-by-feature.ts` — CreditLedger type=CONSUME의 reason 필드를 키워드 파싱하여 전처리/분류/추출/리포트/기타로 분류.

**Step 5: 타입 체크 + Commit**

Run: `npx tsc --noEmit 2>&1 | head -30`

```bash
git add src/actions/ai-monitor/
git commit -m "feat: AI 모니터링 서버 액션 5개 추가 (stats, pipelines, errors, credit-by-workspace/feature)"
```

---

### Task 7: AI 모니터링 — 페이지 + 컴포넌트

**Files:**
- Modify: `src/app/(admin)/[region]/ai-monitor/page.tsx` (기존 스텁 교체)
- Create: `src/app/(admin)/[region]/ai-monitor/loading.tsx`
- Create: `src/app/(admin)/[region]/ai-monitor/pipelines/page.tsx`
- Create: `src/app/(admin)/[region]/ai-monitor/credits/page.tsx`
- Create: `src/components/ai-monitor/pipeline-table.tsx`
- Create: `src/components/ai-monitor/pipeline-error-list.tsx`
- Create: `src/components/ai-monitor/credit-by-workspace-chart.tsx`
- Create: `src/components/ai-monitor/credit-by-feature-chart.tsx`

**Step 1: AI 대시보드 페이지 (기존 스텁 교체)**

Modify: `src/app/(admin)/[region]/ai-monitor/page.tsx`

기존 "준비 중" 카드를 실제 대시보드로 교체:
- 4개 StatCard (오늘 파이프라인, 성공률, 에러 세션, 평균 처리 시간)
- PipelineErrorList (최근 에러 10건)
- CreditConsumptionChart 재사용 (7일 크레딧 소비)

**Step 2: 파이프라인 에러 리스트 컴포넌트**

Create: `src/components/ai-monitor/pipeline-error-list.tsx`

에러 세션 테이블: 워크스페이스, 문서명, 단계 배지, 에러 수, lastError (100자 truncate), 시작 시간.

**Step 3: 파이프라인 목록 페이지**

Create: `src/app/(admin)/[region]/ai-monitor/pipelines/page.tsx`

FilterBar (단계 필터 + 상태 필터 + 검색) + PipelineTable + Pagination. 패턴은 구독 페이지와 동일.

**Step 4: 차트 컴포넌트들**

Create: `src/components/ai-monitor/credit-by-workspace-chart.tsx` — Recharts BarChart (가로 막대)
Create: `src/components/ai-monitor/credit-by-feature-chart.tsx` — Recharts PieChart

**Step 5: AI 크레딧 분석 페이지**

Create: `src/app/(admin)/[region]/ai-monitor/credits/page.tsx`

워크스페이스별 소비 랭킹 차트 + 기능별 소비 비율 차트 + 30일 소비 추이 (CreditConsumptionChart 재사용, days=30).

**Step 6: 타입 체크 + Commit**

Run: `npx tsc --noEmit 2>&1 | head -30`

```bash
git add src/app/\(admin\)/\[region\]/ai-monitor/ src/components/ai-monitor/
git commit -m "feat: AI 모니터링 대시보드, 파이프라인/크레딧 분석 페이지 + 컴포넌트"
```

---

### Task 8: 사용자 심화 — 서버 액션 + 상세 페이지

**Files:**
- Modify: `src/actions/user/get-users.ts` (추가 필드)
- Create: `src/actions/user/get-user-detail.ts`
- Create: `src/app/(admin)/[region]/users/[id]/page.tsx`
- Create: `src/app/(admin)/[region]/users/[id]/loading.tsx`
- Modify: `src/components/user/user-table.tsx` (링크 + 추가 컬럼)
- Create: `src/components/user/user-detail.tsx`

**Step 1: getUsers 수정 — 추가 필드**

Modify: `src/actions/user/get-users.ts`

UserListItem에 추가:
- `createdAt: Date` — 가입일
- `workspaceCount: number` — 워크스페이스 수

기존 `memberships` 쿼리에 `_count: { select: { memberships: true } }` 추가. workspaceCount = _count.memberships.

**Step 2: getUserDetail 액션**

Create: `src/actions/user/get-user-detail.ts`

```typescript
"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-user-detail" });

export interface UserDetail {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
  activeWorkspaceName: string | null;
  workspaces: {
    workspaceId: string;
    workspaceName: string;
    planCode: string;
    creditBalance: number;
    role: string;
    joinedAt: Date;
  }[];
  activity: {
    documentsUploaded: number;
    workspacesOwned: number;
    reportsCreated: number;
  };
}

export async function getUserDetail(
  regionId: string,
  userId: string,
): Promise<ActionResult<UserDetail>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, userId }, "getUserDetail started");

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: {
              select: { id: true, name: true, planCode: true, creditBalance: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!user) return fail("사용자를 찾을 수 없습니다.");

    let activeWorkspaceName: string | null = null;
    if (user.activeWorkspaceId) {
      const ws = await prisma.workspace.findUnique({
        where: { id: user.activeWorkspaceId },
        select: { name: true },
      });
      activeWorkspaceName = ws?.name ?? null;
    }

    const [documentsUploaded, workspacesOwned, reportsCreated] = await Promise.all([
      prisma.document.count({ where: { uploaderId: userId } }),
      user.memberships.filter((m) => m.role === "OWNER").length,
      prisma.report.count({ where: { createdById: userId } }),
    ]);

    const detail: UserDetail = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      activeWorkspaceName,
      workspaces: user.memberships.map((m) => ({
        workspaceId: m.workspace.id,
        workspaceName: m.workspace.name,
        planCode: m.workspace.planCode,
        creditBalance: m.workspace.creditBalance,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      activity: {
        documentsUploaded,
        workspacesOwned,
        reportsCreated,
      },
    };

    log.info({ regionId, userId }, "getUserDetail succeeded");
    return ok(detail);
  } catch (error) {
    log.error({ err: error, regionId, userId }, "getUserDetail failed");
    return fail("사용자 상세 조회에 실패했습니다.");
  }
}
```

**Step 3: UserTable 수정 — 링크 + 추가 컬럼**

Modify: `src/components/user/user-table.tsx`

- 이름을 `Link` 컴포넌트로 감싸서 사용자 상세 페이지 링크 (`/{regionId}/users/{user.id}`)
- `regionId` prop 추가
- "가입일" 컬럼 추가
- "활동 상태" 컬럼 추가 (7일=green 활성, 30일=yellow 비활성, else=gray 휴면)

**Step 4: UserDetail 컴포넌트 + 사용자 상세 페이지**

Create: `src/components/user/user-detail.tsx` — 프로필 카드 + 활동 요약 StatCards + 소속 워크스페이스 테이블

Create: `src/app/(admin)/[region]/users/[id]/page.tsx` — Server Component, getUserDetail 호출

Create: `src/app/(admin)/[region]/users/[id]/loading.tsx` — 스켈레톤

**Step 5: 타입 체크 + Commit**

Run: `npx tsc --noEmit 2>&1 | head -30`

```bash
git add src/actions/user/ src/components/user/ src/app/\(admin\)/\[region\]/users/
git commit -m "feat: 사용자 목록 강화 + 사용자 상세 페이지 추가"
```

---

### Task 9: 워크스페이스 심화 — 탭 구조 + 추가 액션

**Files:**
- Create: `src/actions/workspace/get-workspace-documents.ts`
- Create: `src/actions/workspace/get-workspace-esg.ts`
- Create: `src/actions/workspace/get-workspace-pipelines.ts`
- Create: `src/actions/workspace/get-workspace-subscription.ts`
- Create: `src/actions/workspace/batch-adjust-credits.ts`
- Modify: `src/app/(admin)/[region]/workspaces/[id]/page.tsx` (탭 구조)
- Modify: `src/components/workspace/workspace-detail.tsx` (탭으로 리팩터링)
- Create: `src/components/workspace/workspace-documents-tab.tsx`
- Create: `src/components/workspace/workspace-esg-tab.tsx`
- Create: `src/components/workspace/workspace-pipelines-tab.tsx`
- Create: `src/components/workspace/workspace-subscription-tab.tsx`
- Create: `src/components/workspace/batch-credit-dialog.tsx`

**Step 1: shadcn Tabs 컴포넌트 추가**

Run: `npx shadcn@latest add tabs -y`

**Step 2: 워크스페이스 추가 서버 액션들**

Create: `src/actions/workspace/get-workspace-documents.ts`
— 해당 워크스페이스의 Document 목록 + User(uploader) + DocumentItemLink count + PipelineSession

Create: `src/actions/workspace/get-workspace-esg.ts`
— EsgSummary 전체 목록 + E/S/G 카테고리별 완료율 통계

Create: `src/actions/workspace/get-workspace-pipelines.ts`
— PipelineSession 목록 (Document.fileName include)

Create: `src/actions/workspace/get-workspace-subscription.ts`
— Subscription + Plan + 해당 워크스페이스 Payment 목록

Create: `src/actions/workspace/batch-adjust-credits.ts`
— 여러 워크스페이스에 동시 크레딧 조정. Zod 검증: workspaceIds[], amount, reason.

**Step 3: 탭 컴포넌트들**

Create: `src/components/workspace/workspace-documents-tab.tsx` — 문서 테이블 (파일명, 업로더, 상태 배지, 크기 포맷, 연결 ESG 수, 파이프라인 상태)

Create: `src/components/workspace/workspace-esg-tab.tsx` — 진행 현황 요약 (프로그레스 바 3개: E/S/G) + 항목별 테이블 (코드, 상태 배지, 소스 배지, 완료율, 필드, 업데이트)

Create: `src/components/workspace/workspace-pipelines-tab.tsx` — 파이프라인 세션 테이블 (에러 행 하이라이트 bg-red-50)

Create: `src/components/workspace/workspace-subscription-tab.tsx` — 구독 정보 카드 + 결제 내역 테이블

**Step 4: WorkspaceDetail 탭 구조로 리팩터링**

Modify: `src/components/workspace/workspace-detail.tsx`

기존 카드 레이아웃을 Tabs로 감싼다:
- "개요" 탭: 기존 기본 정보 + 크레딧 조정 + 플랜 변경
- "멤버" 탭: 기존 MemberList
- "크레딧" 탭: 기존 크레딧 이력
- "문서" 탭: WorkspaceDocumentsTab
- "ESG" 탭: WorkspaceEsgTab
- "파이프라인" 탭: WorkspacePipelinesTab
- "구독" 탭: WorkspaceSubscriptionTab

URL 파라미터 `?tab=xxx`로 탭 상태 관리.

**Step 5: 워크스페이스 상세 페이지 수정**

Modify: `src/app/(admin)/[region]/workspaces/[id]/page.tsx`

기존 getWorkspaceDetail에 추가로 탭별 데이터를 조회하여 props로 전달. 또는 각 탭에서 별도 서버 액션 호출 (탭 컴포넌트가 Server Component일 수 있도록).

**Step 6: BatchCreditDialog + 워크스페이스 목록 수정**

Create: `src/components/workspace/batch-credit-dialog.tsx` — Dialog + 금액/사유 입력 폼

Modify: `src/components/workspace/workspace-table.tsx` — 체크박스 추가, 선택 시 상단에 일괄 크레딧 버튼 표시

**Step 7: 타입 체크 + Commit**

Run: `npx tsc --noEmit 2>&1 | head -30`

```bash
git add src/actions/workspace/ src/components/workspace/ src/app/\(admin\)/\[region\]/workspaces/ src/components/ui/tabs.tsx
git commit -m "feat: 워크스페이스 탭 구조 리팩터링 + 문서/ESG/파이프라인/구독 탭 + 일괄 크레딧"
```

---

### Task 10: 콘텐츠/데이터 관리 — 서버 액션

**Files:**
- Create: `src/actions/content/get-content-stats.ts`
- Create: `src/actions/content/get-documents.ts`
- Create: `src/actions/content/get-esg-overview.ts`
- Create: `src/actions/content/get-esg-category-stats.ts`
- Create: `src/actions/content/get-esg-item-rankings.ts`
- Create: `src/actions/content/get-reports.ts`

**Step 1: getContentStats**

Create: `src/actions/content/get-content-stats.ts`

총 문서 수, 이번 주 업로드, ESG 완료율, 리포트 수, 데이터 소스 분포(AI/MANUAL/null).

**Step 2: getDocuments (페이지네이션)**

Create: `src/actions/content/get-documents.ts`

Document 목록 + Workspace.name + User.name + DocumentItemLink count + PipelineSession currentPhase. 필터: status, pipeline 유무, 기간, 검색.

**Step 3: getEsgOverview (페이지네이션)**

Create: `src/actions/content/get-esg-overview.ts`

워크스페이스별 ESG 요약: 총 항목, 완료/진행중/미시작, 완료율, AI 추출 비율, 마지막 업데이트.

**Step 4: getEsgCategoryStats**

Create: `src/actions/content/get-esg-category-stats.ts`

E/S/G 카테고리별 평균 완료율. esgItemCode 접두사로 분류.

**Step 5: getEsgItemRankings**

Create: `src/actions/content/get-esg-item-rankings.ts`

가장 많이 COMPLETED인 esgItemCode Top 5 + 가장 많이 NOT_STARTED인 Top 5.

**Step 6: getReports (페이지네이션)**

Create: `src/actions/content/get-reports.ts`

Report 목록 + Workspace.name + User.name. 검색, 기간 필터.

**Step 7: 타입 체크 + Commit**

Run: `npx tsc --noEmit 2>&1 | head -30`

```bash
git add src/actions/content/
git commit -m "feat: 콘텐츠/데이터 서버 액션 6개 추가 (stats, documents, esg-overview/category/rankings, reports)"
```

---

### Task 11: 콘텐츠/데이터 관리 — 페이지 + 컴포넌트

**Files:**
- Create: `src/app/(admin)/[region]/content/page.tsx`
- Create: `src/app/(admin)/[region]/content/loading.tsx`
- Create: `src/app/(admin)/[region]/content/documents/page.tsx`
- Create: `src/app/(admin)/[region]/content/esg-data/page.tsx`
- Create: `src/app/(admin)/[region]/content/reports/page.tsx`
- Create: `src/components/content/document-table.tsx`
- Create: `src/components/content/esg-overview-table.tsx`
- Create: `src/components/content/esg-category-stats.tsx`
- Create: `src/components/content/esg-item-rankings.tsx`
- Create: `src/components/content/report-table.tsx`
- Create: `src/components/content/esg-completion-chart.tsx`
- Create: `src/components/content/data-source-chart.tsx`

**Step 1: 차트 컴포넌트들**

Create: `src/components/content/esg-completion-chart.tsx` — Recharts BarChart (완료율 분포 히스토그램)
Create: `src/components/content/data-source-chart.tsx` — Recharts PieChart (AI/MANUAL/미설정)

**Step 2: 콘텐츠 대시보드 페이지**

Create: `src/app/(admin)/[region]/content/page.tsx`

4개 StatCard + EsgCompletionChart + DataSourceChart + EsgCategoryStats + EsgItemRankings.

**Step 3: 문서 목록 페이지**

Create: `src/components/content/document-table.tsx` — 문서 테이블
Create: `src/app/(admin)/[region]/content/documents/page.tsx` — FilterBar + DocumentTable + Pagination

**Step 4: ESG 데이터 현황 페이지**

Create: `src/components/content/esg-overview-table.tsx` — 프로그레스 바 포함 테이블
Create: `src/components/content/esg-category-stats.tsx` — E/S/G 3개 프로그레스 바 카드
Create: `src/components/content/esg-item-rankings.tsx` — Top 5 완료/미완료 항목

Create: `src/app/(admin)/[region]/content/esg-data/page.tsx` — EsgCategoryStats + EsgItemRankings + EsgOverviewTable + 필터/페이지네이션

**Step 5: 리포트 목록 페이지**

Create: `src/components/content/report-table.tsx` — 리포트 테이블
Create: `src/app/(admin)/[region]/content/reports/page.tsx` — FilterBar + ReportTable + Pagination

**Step 6: 로딩 상태**

Create: `src/app/(admin)/[region]/content/loading.tsx`

**Step 7: 타입 체크 + Commit**

Run: `npx tsc --noEmit 2>&1 | head -30`

```bash
git add src/app/\(admin\)/\[region\]/content/ src/components/content/
git commit -m "feat: 콘텐츠 대시보드, 문서/ESG데이터/리포트 목록 페이지 + 컴포넌트"
```

---

### Task 12: 검증 + CLAUDE.md 업데이트

**Step 1: TypeScript 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 0개. 에러 있으면 수정.

**Step 2: ESLint**

Run: `npm run lint`
Expected: 변경 파일에서 새로운 에러 없음.

**Step 3: 빌드 테스트**

Run: `npm run build`
Expected: 빌드 성공.

**Step 4: PRO 잔여 참조 확인**

Run: `grep -rn '"PRO"' src/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v '.d.ts'`
Expected: PRO 참조 없어야 함 (Prisma 타입 정의 참조 제외).

**Step 5: CLAUDE.md 업데이트**

Admin CLAUDE.md의 핵심 디렉터리와 DB 모델 섹션을 업데이트:
- `src/actions/billing/`, `src/actions/ai-monitor/`, `src/actions/content/` 추가
- 사이드바 네비게이션 구조 설명 업데이트
- PlanCode enum에 STANDARD/ENTERPRISE 추가

**Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 업데이트 — 신규 기능 영역 반영"
```
