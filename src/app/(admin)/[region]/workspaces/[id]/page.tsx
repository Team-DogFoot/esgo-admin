import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRegion } from "@/lib/regions";
import { getWorkspaceDetail } from "@/actions/workspace/get-workspace-detail";
import { getWorkspaceDocuments } from "@/actions/workspace/get-workspace-documents";
import { getWorkspaceEsg } from "@/actions/workspace/get-workspace-esg";
import { getWorkspacePipelines } from "@/actions/workspace/get-workspace-pipelines";
import { getWorkspaceSubscription } from "@/actions/workspace/get-workspace-subscription";
import { WorkspaceDetail } from "@/components/workspace/workspace-detail";

interface WorkspaceDetailPageProps {
  params: Promise<{ region: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const EMPTY_ESG = {
  summaries: [] as never[],
  overall: { category: "전체" as string, total: 0, completed: 0, inProgress: 0, rate: 0 },
  categories: [] as never[],
};

export default async function WorkspaceDetailPage({ params, searchParams }: WorkspaceDetailPageProps) {
  const { region: regionId, id } = await params;
  const { tab } = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  // Always load workspace detail; load tab data only for the active tab
  const activeTab = tab ?? "overview";

  const [detailResult, documentsResult, esgResult, pipelinesResult, subscriptionResult] =
    await Promise.all([
      getWorkspaceDetail(regionId, id),
      activeTab === "documents" ? getWorkspaceDocuments(regionId, id) : null,
      activeTab === "esg" ? getWorkspaceEsg(regionId, id) : null,
      activeTab === "pipelines" ? getWorkspacePipelines(regionId, id) : null,
      activeTab === "subscription" ? getWorkspaceSubscription(regionId, id) : null,
    ]);

  if (!detailResult.success) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link href={`/${regionId}/workspaces`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              목록으로
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">워크스페이스 상세</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {detailResult.error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href={`/${regionId}/workspaces`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            목록으로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">워크스페이스 상세</h1>
      </div>
      <WorkspaceDetail
        workspace={detailResult.data}
        regionId={regionId}
        documents={documentsResult?.success ? documentsResult.data : []}
        esgData={esgResult?.success ? esgResult.data : EMPTY_ESG}
        pipelines={pipelinesResult?.success ? pipelinesResult.data : []}
        subscriptionData={
          subscriptionResult?.success
            ? subscriptionResult.data
            : { subscription: null, payments: [] }
        }
      />
    </div>
  );
}
