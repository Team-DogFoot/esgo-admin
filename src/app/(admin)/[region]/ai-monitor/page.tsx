import { redirect } from "next/navigation";
import { Activity, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { getRegion } from "@/lib/regions";
import { formatDuration } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { PipelineErrorList } from "@/components/ai-monitor/pipeline-error-list";
import { CreditConsumptionChart } from "@/components/ai-monitor/credit-consumption-chart";
import { getAiStats } from "@/actions/ai-monitor/get-ai-stats";
import { getPipelineErrors } from "@/actions/ai-monitor/get-pipeline-errors";
import { getCreditConsumption } from "@/actions/ai-monitor/get-credit-consumption";

interface AiMonitorPageProps {
  params: Promise<{ region: string }>;
}

export default async function AiMonitorPage({ params }: AiMonitorPageProps) {
  const { region: regionId } = await params;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const [statsResult, errorsResult, consumptionResult] = await Promise.all([
    getAiStats(regionId),
    getPipelineErrors(regionId, 10),
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">AI 서비스 모니터링</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — AI 파이프라인 사용 현황
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="오늘 파이프라인"
          value={stats.todayPipelines}
          icon={Activity}
          description="오늘 시작된 세션 수"
        />
        <StatCard
          title="성공률"
          value={`${stats.successRate}%`}
          icon={CheckCircle}
          description="전체 완료 비율"
        />
        <StatCard
          title="에러 세션"
          value={stats.errorSessions}
          icon={AlertTriangle}
          description="최근 7일 에러 발생"
        />
        <StatCard
          title="평균 소요 시간"
          value={stats.avgDurationMs > 0 ? formatDuration(stats.avgDurationMs) : "-"}
          icon={Clock}
          description="완료된 세션 기준"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {errorsResult.success && (
          <PipelineErrorList errors={errorsResult.data} />
        )}
        {consumptionResult.success && (
          <CreditConsumptionChart
            data={consumptionResult.data}
            title="크레딧 소비 추이 (7일)"
          />
        )}
      </div>
    </div>
  );
}
