import { redirect } from "next/navigation";
import { getRegion } from "@/lib/regions";
import { getSamplePdfMeta } from "@/lib/s3";
import { SamplePdfManager } from "@/components/content/sample-pdf-manager";

interface Props {
  params: Promise<{ region: string }>;
}

export default async function SamplePdfPage({ params }: Props) {
  const { region: regionId } = await params;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const meta = await getSamplePdfMeta(regionId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">샘플 PDF 관리</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 랜딩 페이지에서 다운로드할 수 있는 예시
          보고서를 관리합니다.
        </p>
      </div>
      <SamplePdfManager regionId={regionId} initialMeta={meta} />
    </div>
  );
}
