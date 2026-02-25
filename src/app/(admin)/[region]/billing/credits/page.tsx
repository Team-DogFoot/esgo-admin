import { redirect } from "next/navigation";
import { FilterBar } from "@/components/common/filter-bar";
import { Pagination } from "@/components/common/pagination";
import { CreditLedgerTable } from "@/components/billing/credit-ledger-table";
import { getRegion } from "@/lib/regions";
import { getCreditLedger } from "@/actions/billing/get-credit-ledger";

interface CreditsPageProps {
  params: Promise<{ region: string }>;
  searchParams: Promise<{
    search?: string;
    type?: string;
    dateRange?: string;
    page?: string;
  }>;
}

const TYPE_FILTER_OPTIONS = [
  { label: "전체 유형", value: "ALL" },
  { label: "초기 지급", value: "INITIAL" },
  { label: "월간 지급", value: "MONTHLY" },
  { label: "구매", value: "PURCHASE" },
  { label: "소비", value: "CONSUME" },
  { label: "환불", value: "REFUND" },
  { label: "어드민", value: "ADMIN" },
];

const DATE_RANGE_OPTIONS = [
  { label: "전체 기간", value: "ALL" },
  { label: "이번 달", value: "this_month" },
  { label: "지난 달", value: "last_month" },
  { label: "최근 3개월", value: "3_months" },
];

export default async function CreditsPage({
  params,
  searchParams,
}: CreditsPageProps) {
  const { region: regionId } = await params;
  const { search, type, dateRange, page } = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const currentPage = page ? parseInt(page, 10) : 1;

  const result = await getCreditLedger({
    regionId,
    page: currentPage,
    perPage: 20,
    search: search ?? undefined,
    typeFilter: type || undefined,
    dateRange:
      (dateRange as "this_month" | "last_month" | "3_months" | "all") ??
      undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">크레딧 내역</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 전체 크레딧 변동 이력
        </p>
      </div>

      <div className="mb-4">
        <FilterBar
          filters={[
            { key: "type", label: "유형", options: TYPE_FILTER_OPTIONS },
            {
              key: "dateRange",
              label: "기간",
              options: DATE_RANGE_OPTIONS,
            },
          ]}
          searchPlaceholder="워크스페이스 이름 검색..."
        />
      </div>

      {result.success ? (
        <>
          <CreditLedgerTable items={result.data.items} regionId={regionId} />
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
