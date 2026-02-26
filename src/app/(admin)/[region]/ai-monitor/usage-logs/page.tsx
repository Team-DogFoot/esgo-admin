import { redirect } from "next/navigation";
import { Activity, DollarSign, Database, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar } from "@/components/common/filter-bar";
import { Pagination } from "@/components/common/pagination";
import { UsageLogTable } from "@/components/ai-monitor/usage-log-table";
import { getRegion } from "@/lib/regions";
import { formatCostUsd, formatTokens } from "@/lib/format";
import { getUsageLogs } from "@/actions/ai-monitor/get-usage-logs";
import { getUsageStats } from "@/actions/ai-monitor/get-usage-stats";

interface UsageLogsPageProps {
  params: Promise<{ region: string }>;
  searchParams: Promise<{
    page?: string;
    provider?: string;
    success?: string;
    search?: string;
  }>;
}

const PROVIDER_FILTER_OPTIONS = [
  { label: "전체 서비스", value: "ALL" },
  { label: "Gemini", value: "GEMINI" },
  { label: "Document AI", value: "DOCUMENT_AI" },
  { label: "Cloud Vision", value: "CLOUD_VISION" },
];

const STATUS_FILTER_OPTIONS = [
  { label: "전체 상태", value: "ALL" },
  { label: "성공", value: "true" },
  { label: "실패", value: "false" },
];

export default async function UsageLogsPage({ params, searchParams }: UsageLogsPageProps) {
  const { region: regionId } = await params;
  const { page, provider, success, search } = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const currentPage = Math.max(1, Number(page) || 1);

  const [result, statsResult] = await Promise.all([
    getUsageLogs({
      regionId,
      page: currentPage,
      perPage: 20,
      provider: provider as "GEMINI" | "DOCUMENT_AI" | "CLOUD_VISION" | undefined,
      success: success as "true" | "false" | undefined,
      search: search ?? undefined,
    }),
    getUsageStats({ regionId }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI 사용량 로그</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — AI 서비스 사용 내역 (최근 30일)
        </p>
      </div>

      {statsResult.success && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 요청</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsResult.data.totalRequests.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 비용</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCostUsd(statsResult.data.totalCostUsd)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gemini 토큰</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTokens(statsResult.data.totalGeminiTokens)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">OCR 처리 건수</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsResult.data.totalOcrPages.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mb-4">
        <FilterBar
          filters={[
            { key: "provider", label: "서비스", options: PROVIDER_FILTER_OPTIONS },
            { key: "success", label: "상태", options: STATUS_FILTER_OPTIONS },
          ]}
          searchPlaceholder="작업, 모델, 워크스페이스 검색..."
        />
      </div>

      {result.success ? (
        <>
          <UsageLogTable logs={result.data.items} />
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
