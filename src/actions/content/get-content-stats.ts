"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-content-stats" });

export interface ContentStats {
  totalDocuments: number;
  weeklyUploads: number;
  esgCompletionRate: number;
  totalReports: number;
  dataSourceDistribution: { source: string; count: number }[];
}

function getThisWeekMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function getContentStats(
  regionId: string,
): Promise<ActionResult<ContentStats>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId }, "getContentStats started");

  try {
    const monday = getThisWeekMonday();

    const [
      totalDocuments,
      weeklyUploads,
      esgTotal,
      esgCompleted,
      totalReports,
      sourceGroups,
    ] = await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { createdAt: { gte: monday } } }),
      prisma.esgSummary.count(),
      prisma.esgSummary.count({ where: { status: "COMPLETED" } }),
      prisma.report.count(),
      prisma.esgSummary.groupBy({
        by: ["source"],
        _count: { id: true },
      }),
    ]);

    const dataSourceDistribution = sourceGroups.map((g) => ({
      source: g.source ?? "미설정",
      count: g._count.id,
    }));

    const stats: ContentStats = {
      totalDocuments,
      weeklyUploads,
      esgCompletionRate:
        esgTotal > 0 ? Math.round((esgCompleted / esgTotal) * 100) : 0,
      totalReports,
      dataSourceDistribution,
    };

    log.info(
      { regionId, totalDocuments, weeklyUploads },
      "getContentStats succeeded",
    );
    return ok(stats);
  } catch (error) {
    log.error({ err: error, regionId }, "getContentStats failed");
    return fail("콘텐츠 통계 조회에 실패했습니다.");
  }
}
