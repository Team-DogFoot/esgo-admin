import { redirect } from "next/navigation";
import { getRegion } from "@/lib/regions";
import { getWorkspaces } from "@/actions/workspace/get-workspaces";
import { WorkspaceTable } from "@/components/workspace/workspace-table";

interface WorkspacesPageProps {
  params: Promise<{ region: string }>;
  searchParams: Promise<{ search?: string; plan?: string }>;
}

export default async function WorkspacesPage({ params, searchParams }: WorkspacesPageProps) {
  const { region: regionId } = await params;
  const { search, plan } = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const result = await getWorkspaces({
    regionId,
    search: search ?? undefined,
    planFilter: plan ?? undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">워크스페이스</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 전체 워크스페이스 관리
        </p>
      </div>
      {result.success ? (
        <WorkspaceTable workspaces={result.data} regionId={regionId} />
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {result.error}
        </div>
      )}
    </div>
  );
}
