import { redirect } from "next/navigation";
import { FilterBar } from "@/components/common/filter-bar";
import { Pagination } from "@/components/common/pagination";
import { PaymentTable } from "@/components/billing/payment-table";
import { getRegion } from "@/lib/regions";
import { getPayments } from "@/actions/billing/get-payments";

interface PaymentsPageProps {
  params: Promise<{ region: string }>;
  searchParams: Promise<{
    search?: string;
    status?: string;
    dateRange?: string;
    page?: string;
  }>;
}

const STATUS_FILTER_OPTIONS = [
  { label: "전체 상태", value: "ALL" },
  { label: "결제 완료", value: "PAID" },
  { label: "대기", value: "PENDING" },
  { label: "실패", value: "FAILED" },
  { label: "환불", value: "REFUNDED" },
  { label: "취소", value: "CANCELED" },
];

const DATE_RANGE_OPTIONS = [
  { label: "전체 기간", value: "ALL" },
  { label: "이번 달", value: "this_month" },
  { label: "지난 달", value: "last_month" },
  { label: "최근 3개월", value: "3_months" },
];

export default async function PaymentsPage({
  params,
  searchParams,
}: PaymentsPageProps) {
  const { region: regionId } = await params;
  const { search, status, dateRange, page } = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const currentPage = page ? parseInt(page, 10) : 1;

  const result = await getPayments({
    regionId,
    page: currentPage,
    perPage: 20,
    search: search ?? undefined,
    statusFilter: status ?? undefined,
    dateRange:
      (dateRange as "this_month" | "last_month" | "3_months" | "all") ??
      undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">결제 내역</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 전체 결제 현황
        </p>
      </div>

      <div className="mb-4">
        <FilterBar
          filters={[
            { key: "status", label: "상태", options: STATUS_FILTER_OPTIONS },
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
          <PaymentTable payments={result.data.items} regionId={regionId} />
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
