import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRegion } from "@/lib/regions";
import { getWorkspaceDetail } from "@/actions/workspace/get-workspace-detail";
import { WorkspaceDetail } from "@/components/workspace/workspace-detail";

interface WorkspaceDetailPageProps {
  params: Promise<{ region: string; id: string }>;
}

export default async function WorkspaceDetailPage({ params }: WorkspaceDetailPageProps) {
  const { region: regionId, id } = await params;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const result = await getWorkspaceDetail(regionId, id);

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
      {result.success ? (
        <WorkspaceDetail workspace={result.data} regionId={regionId} />
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{result.error}</div>
      )}
    </div>
  );
}
