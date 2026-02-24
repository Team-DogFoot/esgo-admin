import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRegion } from "@/lib/regions";

interface AiMonitorPageProps {
  params: Promise<{ region: string }>;
}

export default async function AiMonitorPage({ params }: AiMonitorPageProps) {
  const { region: regionId } = await params;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI 서비스 모니터링</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — AI 파이프라인 사용 현황
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle>준비 중</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            AI 기능별 요청 비용, 사용 토큰 수집이 구현된 후 이 페이지에 모니터링 데이터가 표시됩니다.
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>향후 표시 예정:</p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>파이프라인 실행 횟수 및 성공/실패 비율</li>
              <li>AI 기능별 (전처리/분류/추출/보고서) 크레딧 소비 추이</li>
              <li>요청별 토큰 사용량 및 비용</li>
              <li>평균 응답 시간</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
