import { getRegion } from "@/lib/regions";
import { notFound } from "next/navigation";

interface RegionPageProps {
  params: Promise<{ region: string }>;
}

export default async function RegionDashboardPage({ params }: RegionPageProps) {
  const { region } = await params;
  const regionData = getRegion(region);

  if (!regionData) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {regionData.flag} {regionData.name} 대시보드
        </h1>
        <p className="text-sm text-muted-foreground">{regionData.domain}</p>
      </div>
      <p className="text-sm text-muted-foreground">통계 대시보드가 여기에 표시됩니다.</p>
    </div>
  );
}
