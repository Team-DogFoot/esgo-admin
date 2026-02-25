import { redirect } from "next/navigation";
import { FilterBar } from "@/components/common/filter-bar";
import { Pagination } from "@/components/common/pagination";
import { DocumentTable } from "@/components/content/document-table";
import { getRegion } from "@/lib/regions";
import { getDocuments } from "@/actions/content/get-documents";

interface DocumentsPageProps {
  params: Promise<{ region: string }>;
  searchParams: Promise<{
    page?: string;
    status?: string;
    pipeline?: string;
    dateRange?: string;
    search?: string;
  }>;
}

const STATUS_OPTIONS = [
  { label: "업로드", value: "UPLOADED" },
  { label: "전처리 완료", value: "PREPROCESSED" },
  { label: "분류 완료", value: "CLASSIFIED" },
  { label: "분석 중", value: "ANALYZING" },
  { label: "분석 완료", value: "ANALYZED" },
];

const PIPELINE_OPTIONS = [
  { label: "파이프라인 있음", value: "true" },
  { label: "파이프라인 없음", value: "false" },
];

const DATE_RANGE_OPTIONS = [
  { label: "이번 달", value: "this_month" },
  { label: "지난 달", value: "last_month" },
  { label: "최근 3개월", value: "3_months" },
];

export default async function DocumentsPage({
  params,
  searchParams,
}: DocumentsPageProps) {
  const { region: regionId } = await params;
  const { page, status, pipeline, dateRange, search } = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const hasPipeline =
    pipeline === "true" ? true : pipeline === "false" ? false : undefined;

  const result = await getDocuments({
    regionId,
    page: page ? parseInt(page, 10) : 1,
    statusFilter: status as
      | "UPLOADED"
      | "PREPROCESSED"
      | "CLASSIFIED"
      | "ANALYZING"
      | "ANALYZED"
      | undefined,
    hasPipeline,
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
        <h1 className="text-2xl font-bold">문서 관리</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 전체 업로드 문서 목록
        </p>
      </div>

      <div className="mb-4">
        <FilterBar
          searchPlaceholder="파일명 또는 워크스페이스 검색..."
          filters={[
            { key: "status", label: "상태", options: STATUS_OPTIONS },
            { key: "pipeline", label: "파이프라인", options: PIPELINE_OPTIONS },
            { key: "dateRange", label: "기간", options: DATE_RANGE_OPTIONS },
          ]}
        />
      </div>

      {result.success ? (
        <>
          <DocumentTable documents={result.data.items} regionId={regionId} />
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
