import { redirect } from "next/navigation";
import { getRegion } from "@/lib/regions";
import { getUsers } from "@/actions/user/get-users";
import { UserTable } from "@/components/user/user-table";

interface UsersPageProps {
  params: Promise<{ region: string }>;
  searchParams: Promise<{ search?: string }>;
}

export default async function UsersPage({ params, searchParams }: UsersPageProps) {
  const { region: regionId } = await params;
  const { search } = await searchParams;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const result = await getUsers({ regionId, search: search ?? undefined });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">사용자</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 전체 사용자 관리
        </p>
      </div>
      {result.success ? (
        <UserTable users={result.data} regionId={regionId} />
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {result.error}
        </div>
      )}
    </div>
  );
}
