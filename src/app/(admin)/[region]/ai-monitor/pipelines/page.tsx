import { redirect } from "next/navigation";
import { getRegion } from "@/lib/regions";
import { FilterBar } from "@/components/common/filter-bar";
import { Pagination } from "@/components/common/pagination";
import { PipelineTable } from "@/components/ai-monitor/pipeline-table";
import { getPipelines } from "@/actions/ai-monitor/get-pipelines";

interface PipelinesPageProps {
  params: Promise<{ region: string }>;
  searchParams: Promise<{
    page?: string;
    phase?: string;
    status?: string;
    search?: string;
  }>;
}

const PHASE_FILTER_OPTIONS = [
  { label: "전체 단계", value: "ALL" },
  { label: "전처리", value: "PREPROCESSED" },
  { label: "분류", value: "CLASSIFIED" },
  { label: "추출", value: "EXTRACTED" },
];

const STATUS_FILTER_OPTIONS = [
  { label: "전체 상태", value: "ALL" },
  { label: "실행 중", value: "running" },
  { label: "완료", value: "completed" },
  { label: "에러", value: "error" },
];

export default async function PipelinesPage({ params, searchParams }: PipelinesPageProps) {
  const { region: regionId } = await params;
  const { page, phase, status, search } = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const currentPage = Math.max(1, Number(page) || 1);

  const result = await getPipelines({
    regionId,
    page: currentPage,
    pageSize: 20,
    phase: phase as "PREPROCESSED" | "CLASSIFIED" | "EXTRACTED" | undefined,
    status: (status as "all" | "running" | "completed" | "error") ?? "all",
    search: search ?? undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">파이프라인 목록</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 전체 파이프라인 세션 관리
        </p>
      </div>

      <div className="mb-4">
        <FilterBar
          filters={[
            { key: "phase", label: "단계", options: PHASE_FILTER_OPTIONS },
            { key: "status", label: "상태", options: STATUS_FILTER_OPTIONS },
          ]}
          searchPlaceholder="워크스페이스 / 문서 검색..."
        />
      </div>

      {result.success ? (
        <>
          <PipelineTable pipelines={result.data.items} regionId={regionId} />
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
