import { redirect } from "next/navigation";
import { Building2, Users, Coins, FileText, CheckCircle } from "lucide-react";
import { getRegion } from "@/lib/regions";
import { getRegionStats } from "@/actions/dashboard/get-region-stats";
import { StatCard } from "@/components/dashboard/stat-card";
import { PlanDistribution } from "@/components/dashboard/plan-distribution";

interface DashboardPageProps {
  params: Promise<{ region: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { region: regionId } = await params;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const result = await getRegionStats(regionId);
  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {result.error}
        </div>
      </div>
    );
  }

  const stats = result.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {region.flag} {region.name} 대시보드
        </h1>
        <p className="text-sm text-muted-foreground">{region.domain}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="총 워크스페이스" value={stats.totalWorkspaces} icon={Building2} />
        <StatCard title="활성 사용자" value={stats.activeUsers} icon={Users} description="최근 7일" />
        <StatCard title="총 크레딧 소비" value={stats.totalCreditsConsumed.toLocaleString()} icon={Coins} />
        <StatCard title="총 문서" value={stats.totalDocuments} icon={FileText} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlanDistribution data={stats.planDistribution} />
        <StatCard title="ESG 완료율" value={`${stats.esgCompletionRate}%`} icon={CheckCircle} description="전체 COMPLETED 비율" />
      </div>
    </div>
  );
}
