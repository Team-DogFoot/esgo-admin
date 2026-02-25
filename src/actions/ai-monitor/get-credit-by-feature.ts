"use server";

import { z } from "zod";
import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

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

export const getCreditByFeature = createAction(
  { module: "get-credit-by-feature" },
  async (_session, input: z.input<typeof schema>): Promise<CreditByFeatureItem[]> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

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

    return Array.from(featureMap.entries())
      .map(([feature, amount]) => ({ feature, amount }))
      .sort((a, b) => b.amount - a.amount);
  },
);
