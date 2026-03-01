import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_MAP: Record<string, string> = {
  kr: "esgohq-documents",
  vn: "esgohq-documents-vn",
  mx: "esgohq-documents-mx",
};

export interface SamplePdfMeta {
  exists: boolean;
  sizeBytes?: number;
  lastModified?: string;
}

export async function getSamplePdfMeta(
  regionId: string,
): Promise<SamplePdfMeta> {
  const bucket = BUCKET_MAP[regionId];
  if (!bucket) return { exists: false };

  const key =
    regionId === "kr"
      ? "samples/sample-report.pdf"
      : "samples/sample-scorecard.pdf";

  try {
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    return {
      exists: true,
      sizeBytes: head.ContentLength,
      lastModified: head.LastModified?.toISOString(),
    };
  } catch {
    return { exists: false };
  }
}
