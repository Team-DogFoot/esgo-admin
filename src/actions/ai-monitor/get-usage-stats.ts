"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

export interface UsageStats {
  totalRequests: number;
  totalCostUsd: number;
  totalGeminiTokens: number;
  totalOcrPages: number;
}

export const getUsageStats = createAction(
  { module: "get-usage-stats" },
  async (_session, regionId: string): Promise<UsageStats> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [overall, geminiTokens] = await Promise.all([
      prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: {
          estimatedCostUsd: true,
          pageCount: true,
          imageCount: true,
        },
      }),
      prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: since }, provider: "GEMINI" },
        _sum: { totalTokens: true },
      }),
    ]);

    return {
      totalRequests: overall._count,
      totalCostUsd: overall._sum.estimatedCostUsd ?? 0,
      totalGeminiTokens: geminiTokens._sum.totalTokens ?? 0,
      totalOcrPages:
        (overall._sum.pageCount ?? 0) + (overall._sum.imageCount ?? 0),
    };
  },
);
