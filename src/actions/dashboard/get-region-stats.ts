"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-region-stats" });

export interface RegionStats {
  totalWorkspaces: number;
  activeUsers: number;
  totalCreditsConsumed: number;
  totalDocuments: number;
  planDistribution: { planCode: string; count: number }[];
  esgCompletionRate: number;
}

export async function getRegionStats(regionId: string): Promise<ActionResult<RegionStats>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);

  log.info({ regionId }, "getRegionStats started");

  try {
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

    const stats: RegionStats = {
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

    log.info({ regionId, stats: { totalWorkspaces, activeUsers } }, "getRegionStats succeeded");
    return ok(stats);
  } catch (error) {
    log.error({ err: error, regionId }, "getRegionStats failed");
    return fail("통계 조회에 실패했습니다.");
  }
}
