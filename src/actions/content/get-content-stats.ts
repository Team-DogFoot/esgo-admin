"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

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

export const getContentStats = createAction(
  { module: "get-content-stats" },
  async (_session, regionId: string): Promise<ContentStats> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

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

    return {
      totalDocuments,
      weeklyUploads,
      esgCompletionRate:
        esgTotal > 0 ? Math.round((esgCompleted / esgTotal) * 100) : 0,
      totalReports,
      dataSourceDistribution,
    };
  },
);
