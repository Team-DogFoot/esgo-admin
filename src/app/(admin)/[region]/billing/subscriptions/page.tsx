import { redirect } from "next/navigation";
import { FilterBar } from "@/components/common/filter-bar";
import { Pagination } from "@/components/common/pagination";
import { SubscriptionTable } from "@/components/billing/subscription-table";
import { getRegion } from "@/lib/regions";
import { getSubscriptions } from "@/actions/billing/get-subscriptions";

interface SubscriptionsPageProps {
  params: Promise<{ region: string }>;
  searchParams: Promise<{
    search?: string;
    plan?: string;
    status?: string;
    page?: string;
  }>;
}

const PLAN_FILTER_OPTIONS = [
  { label: "전체 플랜", value: "ALL" },
  { label: "FREE", value: "FREE" },
  { label: "PRO", value: "PRO" },
];

const STATUS_FILTER_OPTIONS = [
  { label: "전체 상태", value: "ALL" },
  { label: "활성", value: "ACTIVE" },
  { label: "해지", value: "CANCELED" },
  { label: "연체", value: "PAST_DUE" },
  { label: "만료", value: "EXPIRED" },
];

export default async function SubscriptionsPage({
  params,
  searchParams,
}: SubscriptionsPageProps) {
  const { region: regionId } = await params;
  const { search, plan, status, page } = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const currentPage = page ? parseInt(page, 10) : 1;

  const result = await getSubscriptions({
    regionId,
    page: currentPage,
    perPage: 20,
    search: search ?? undefined,
    planFilter: plan ?? undefined,
    statusFilter: status ?? undefined,
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
          filters={[
            { key: "plan", label: "플랜", options: PLAN_FILTER_OPTIONS },
            { key: "status", label: "상태", options: STATUS_FILTER_OPTIONS },
          ]}
          searchPlaceholder="워크스페이스 이름 검색..."
        />
      </div>

      {result.success ? (
        <>
          <SubscriptionTable
            subscriptions={result.data.items}
            regionId={regionId}
          />
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
