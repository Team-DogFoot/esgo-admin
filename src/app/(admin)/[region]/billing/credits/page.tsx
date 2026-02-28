import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRegion } from "@/lib/regions";

interface CreditsPageProps {
  params: Promise<{ region: string }>;
}

export default async function CreditsPage({
  params,
}: CreditsPageProps) {
  const { region: regionId } = await params;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">크레딧 내역</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">시스템 변경 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            크레딧 시스템이 건수 기반 시스템으로 마이그레이션되었습니다.
            사용량 정보는 워크스페이스 상세 페이지에서 확인할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
