import { redirect } from "next/navigation";
import { getRegion } from "@/lib/regions";
import { CreditByWorkspaceChart } from "@/components/ai-monitor/credit-by-workspace-chart";
import { CreditByFeatureChart } from "@/components/ai-monitor/credit-by-feature-chart";
import { CreditConsumptionTrendChart } from "@/components/ai-monitor/credit-consumption-trend-chart";
import { getCreditByWorkspace } from "@/actions/ai-monitor/get-credit-by-workspace";
import { getCreditByFeature } from "@/actions/ai-monitor/get-credit-by-feature";
import { getCreditConsumption } from "@/actions/ai-monitor/get-credit-consumption";

interface CreditsPageProps {
  params: Promise<{ region: string }>;
}

export default async function CreditsPage({ params }: CreditsPageProps) {
  const { region: regionId } = await params;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const [workspaceResult, featureResult, trendResult] = await Promise.all([
    getCreditByWorkspace(regionId, 10),
    getCreditByFeature({ regionId }),
    getCreditConsumption({ regionId, days: 30 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">크레딧 분석</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — AI 크레딧 소비 분석
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {workspaceResult.success ? (
          <CreditByWorkspaceChart
            data={workspaceResult.data.map((item) => ({
              workspaceName: item.workspaceName,
              totalAmount: item.totalAmount,
            }))}
          />
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {workspaceResult.error}
          </div>
        )}

        {featureResult.success ? (
          <CreditByFeatureChart data={featureResult.data} />
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {featureResult.error}
          </div>
        )}
      </div>

      <div className="mt-6">
        {trendResult.success ? (
          <CreditConsumptionTrendChart
            data={trendResult.data}
            title="크레딧 소비 추이 (30일)"
          />
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {trendResult.error}
          </div>
        )}
      </div>
    </div>
  );
}
