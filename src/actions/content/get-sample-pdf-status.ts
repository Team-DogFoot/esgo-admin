"use server";

import { z } from "zod";
import { ok, fail } from "@/lib/action";
import { getRegion } from "@/lib/regions";
import { getSamplePdfMeta } from "@/lib/s3";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/lib/action";
import type { SamplePdfMeta } from "@/lib/s3";

const log = logger.child({ module: "get-sample-pdf-status" });
const schema = z.object({ regionId: z.string() });

export async function getSamplePdfStatus(
  input: Record<string, unknown>,
): Promise<ActionResult<SamplePdfMeta>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const region = getRegion(parsed.data.regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  try {
    const meta = await getSamplePdfMeta(parsed.data.regionId);
    return ok(meta);
  } catch (error) {
    log.error({ err: error }, "getSamplePdfStatus failed");
    return fail("샘플 PDF 상태 조회 중 오류가 발생했습니다.");
  }
}
