"use server";

import { z } from "zod";
import { ok, fail } from "@/lib/action";
import { getRegion } from "@/lib/regions";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/lib/action";

const log = logger.child({ module: "regenerate-sample-pdf" });

const schema = z.object({ regionId: z.string() });

interface RegenerateResult {
  success: boolean;
  s3Key: string;
  sizeBytes: number;
  generatedAt: string;
}

function buildUrl(domain: string, path: string): string {
  const protocol = domain.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${domain}${path}`;
}

export async function regenerateSamplePdf(
  input: Record<string, unknown>,
): Promise<ActionResult<RegenerateResult>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const region = getRegion(parsed.data.regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  try {
    const url = buildUrl(
      region.domain,
      "/api/internal/generate-sample-pdf",
    );
    log.info(
      { regionId: parsed.data.regionId, url },
      "requesting sample PDF generation",
    );

    const response = await fetch(url, {
      method: "POST",
      headers: { "x-internal-api-key": env.INTERNAL_API_KEY },
    });

    if (!response.ok) {
      const body = await response.text();
      log.error(
        { status: response.status, body },
        "sample PDF generation failed",
      );
      return fail(`생성 실패: ${response.status}`);
    }

    const result = (await response.json()) as RegenerateResult;
    log.info(
      { regionId: parsed.data.regionId, result },
      "sample PDF generated",
    );
    return ok(result);
  } catch (error) {
    log.error({ err: error }, "regenerateSamplePdf failed");
    return fail("샘플 PDF 생성 중 오류가 발생했습니다.");
  }
}
