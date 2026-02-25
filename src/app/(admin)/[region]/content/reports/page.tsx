import { redirect } from "next/navigation";
import { FilterBar } from "@/components/common/filter-bar";
import { Pagination } from "@/components/common/pagination";
import { ReportTable } from "@/components/content/report-table";
import { getRegion } from "@/lib/regions";
import { getReports } from "@/actions/content/get-reports";

interface ReportsPageProps {
  params: Promise<{ region: string }>;
  searchParams: Promise<{
    page?: string;
    dateRange?: string;
    search?: string;
  }>;
}

const DATE_RANGE_OPTIONS = [
  { label: "전체 기간", value: "ALL" },
  { label: "이번 달", value: "this_month" },
  { label: "지난 달", value: "last_month" },
  { label: "최근 3개월", value: "3_months" },
];

export default async function ReportsPage({
  params,
  searchParams,
}: ReportsPageProps) {
  const { region: regionId } = await params;
  const { page, dateRange, search } = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const result = await getReports({
    regionId,
    page: page ? parseInt(page, 10) : 1,
    dateRange: dateRange as
      | "this_month"
      | "last_month"
      | "3_months"
      | "all"
      | undefined,
    search: search ?? undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">보고서</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 생성된 보고서 목록
        </p>
      </div>

      <div className="mb-4">
        <FilterBar
          searchPlaceholder="제목 또는 워크스페이스 검색..."
          filters={[
            { key: "dateRange", label: "기간", options: DATE_RANGE_OPTIONS },
          ]}
        />
      </div>

      {result.success ? (
        <>
          <ReportTable reports={result.data.items} regionId={regionId} />
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
