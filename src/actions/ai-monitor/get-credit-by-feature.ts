"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-credit-by-feature" });

export interface CreditByFeatureItem {
  feature: string;
  amount: number;
}

function categorizeReason(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.includes("전처리") || lower.includes("preprocess")) return "전처리";
  if (lower.includes("분류") || lower.includes("classif")) return "분류";
  if (lower.includes("추출") || lower.includes("extract")) return "추출";
  if (lower.includes("리포트") || lower.includes("report")) return "리포트";
  return "기타";
}

const schema = z.object({
  regionId: z.string(),
});

export async function getCreditByFeature(
  input: z.input<typeof schema>,
): Promise<ActionResult<CreditByFeatureItem[]>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId } = parsed.data;
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId }, "getCreditByFeature started");

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const ledgers = await prisma.creditLedger.findMany({
      where: { type: "CONSUME", createdAt: { gte: thirtyDaysAgo } },
      select: { reason: true, amount: true },
    });

    const featureMap = new Map<string, number>();

    for (const ledger of ledgers) {
      const feature = categorizeReason(ledger.reason);
      const current = featureMap.get(feature) ?? 0;
      featureMap.set(feature, current + Math.abs(ledger.amount));
    }

    const items: CreditByFeatureItem[] = Array.from(featureMap.entries())
      .map(([feature, amount]) => ({ feature, amount }))
      .sort((a, b) => b.amount - a.amount);

    log.info({ regionId, features: items.length }, "getCreditByFeature succeeded");
    return ok(items);
  } catch (error) {
    log.error({ err: error, regionId }, "getCreditByFeature failed");
    return fail("기능별 크레딧 조회에 실패했습니다.");
  }
}
