"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

export interface RegionStats {
  totalWorkspaces: number;
  activeUsers: number;
  totalCreditsConsumed: number;
  totalDocuments: number;
  planDistribution: { planCode: string; count: number }[];
  esgCompletionRate: number;
}

export const getRegionStats = createAction(
  { module: "get-region-stats" },
  async (_session, regionId: string): Promise<RegionStats> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const [
      totalWorkspaces,
      activeUsers,
      creditAgg,
      totalDocuments,
      planGroups,
      esgTotal,
      esgCompleted,
    ] = await Promise.all([
      prisma.workspace.count(),
      prisma.user.count({
        where: {
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.creditLedger.aggregate({
        _sum: { amount: true },
        where: { type: "CONSUME" },
      }),
      prisma.document.count(),
      prisma.workspace.groupBy({
        by: ["planCode"],
        _count: { id: true },
      }),
      prisma.esgSummary.count(),
      prisma.esgSummary.count({ where: { status: "COMPLETED" } }),
    ]);

    return {
      totalWorkspaces,
      activeUsers,
      totalCreditsConsumed: Math.abs(creditAgg._sum.amount ?? 0),
      totalDocuments,
      planDistribution: planGroups.map((g) => ({
        planCode: g.planCode,
        count: g._count.id,
      })),
      esgCompletionRate: esgTotal > 0 ? Math.round((esgCompleted / esgTotal) * 100) : 0,
    };
  },
);
