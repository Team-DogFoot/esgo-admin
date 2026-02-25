import { redirect } from "next/navigation";
import { FilterBar } from "@/components/common/filter-bar";
import { Pagination } from "@/components/common/pagination";
import { EsgCategoryStats } from "@/components/content/esg-category-stats";
import { EsgItemRankings } from "@/components/content/esg-item-rankings";
import { EsgOverviewTable } from "@/components/content/esg-overview-table";
import { getRegion } from "@/lib/regions";
import { PLAN_LABEL } from "@/lib/constants";
import { getEsgCategoryStats } from "@/actions/content/get-esg-category-stats";
import { getEsgItemRankings } from "@/actions/content/get-esg-item-rankings";
import { getEsgOverview } from "@/actions/content/get-esg-overview";

interface EsgDataPageProps {
  params: Promise<{ region: string }>;
  searchParams: Promise<{
    page?: string;
    completionRange?: string;
    plan?: string;
    search?: string;
  }>;
}

const COMPLETION_RANGE_OPTIONS = [
  { label: "전체 완료율", value: "" },
  { label: "0-25%", value: "0-25" },
  { label: "25-50%", value: "25-50" },
  { label: "50-75%", value: "50-75" },
  { label: "75-100%", value: "75-100" },
];

const PLAN_OPTIONS = [
  { label: "전체 플랜", value: "" },
  ...Object.entries(PLAN_LABEL).map(([value, label]) => ({
    label,
    value,
  })),
];

export default async function EsgDataPage({
  params,
  searchParams,
}: EsgDataPageProps) {
  const { region: regionId } = await params;
  const { page, completionRange, plan, search } = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const [categoryResult, rankingsResult, overviewResult] = await Promise.all([
    getEsgCategoryStats(regionId),
    getEsgItemRankings(regionId),
    getEsgOverview({
      regionId,
      page: page ? parseInt(page, 10) : 1,
      completionRange: (completionRange || undefined) as
        | "0-25"
        | "25-50"
        | "50-75"
        | "75-100"
        | undefined,
      planFilter: plan || undefined,
      search: search || undefined,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ESG 데이터</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — ESG 항목별 현황 및 워크스페이스 진행도
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          {categoryResult.success ? (
            <EsgCategoryStats stats={categoryResult.data} />
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {categoryResult.error}
            </div>
          )}
        </div>
        <div>
          {rankingsResult.success ? (
            <EsgItemRankings rankings={rankingsResult.data} />
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {rankingsResult.error}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <FilterBar
          searchPlaceholder="워크스페이스 검색..."
          filters={[
            {
              key: "completionRange",
              label: "완료율",
              options: COMPLETION_RANGE_OPTIONS,
            },
            { key: "plan", label: "플랜", options: PLAN_OPTIONS },
          ]}
        />
      </div>

      {overviewResult.success ? (
        <>
          <EsgOverviewTable
            items={overviewResult.data.items}
            regionId={regionId}
          />
          <Pagination
            page={overviewResult.data.page}
            totalPages={overviewResult.data.totalPages}
            total={overviewResult.data.total}
          />
        </>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {overviewResult.error}
        </div>
      )}
    </div>
  );
}
