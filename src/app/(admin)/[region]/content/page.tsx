import { redirect } from "next/navigation";
import { FileText, Upload, CheckCircle, ClipboardList } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { EsgCompletionChart } from "@/components/content/esg-completion-chart";
import { DataSourceChart } from "@/components/content/data-source-chart";
import { EsgCategoryStats } from "@/components/content/esg-category-stats";
import { EsgItemRankings } from "@/components/content/esg-item-rankings";
import { getRegion } from "@/lib/regions";
import { getContentStats } from "@/actions/content/get-content-stats";
import { getEsgCategoryStats } from "@/actions/content/get-esg-category-stats";
import { getEsgItemRankings } from "@/actions/content/get-esg-item-rankings";
import { getEsgOverview } from "@/actions/content/get-esg-overview";

interface ContentPageProps {
  params: Promise<{ region: string }>;
}

export default async function ContentPage({ params }: ContentPageProps) {
  const { region: regionId } = await params;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const [statsResult, categoryResult, rankingsResult, overviewResult] =
    await Promise.all([
      getContentStats(regionId),
      getEsgCategoryStats(regionId),
      getEsgItemRankings(regionId),
      getEsgOverview({ regionId, page: 1 }),
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

  const completionHistogram = buildCompletionHistogram(
    overviewResult.success ? overviewResult.data.items : [],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">콘텐츠/데이터 관리</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 문서, ESG 데이터, 보고서 현황
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="총 문서"
          value={stats.totalDocuments}
          icon={FileText}
        />
        <StatCard
          title="금주 업로드"
          value={stats.weeklyUploads}
          icon={Upload}
          description="이번 주 월요일 이후"
        />
        <StatCard
          title="ESG 완료율"
          value={`${stats.esgCompletionRate}%`}
          icon={CheckCircle}
          description="전체 COMPLETED 비율"
        />
        <StatCard
          title="총 보고서"
          value={stats.totalReports}
          icon={ClipboardList}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EsgCompletionChart data={completionHistogram} />
        <DataSourceChart data={stats.dataSourceDistribution} />
      </div>

      <div className="mt-6">
        {categoryResult.success && (
          <EsgCategoryStats stats={categoryResult.data} />
        )}
      </div>

      <div className="mt-6">
        {rankingsResult.success && (
          <EsgItemRankings rankings={rankingsResult.data} />
        )}
      </div>
    </div>
  );
}

function buildCompletionHistogram(
  items: { completionRate: number }[],
): { range: string; count: number }[] {
  const ranges = [
    { range: "0-25%", min: 0, max: 25 },
    { range: "25-50%", min: 25, max: 50 },
    { range: "50-75%", min: 50, max: 75 },
    { range: "75-100%", min: 75, max: 101 },
  ];

  return ranges.map(({ range, min, max }) => ({
    range,
    count: items.filter(
      (item) => item.completionRate >= min && item.completionRate < max,
    ).length,
  }));
}
