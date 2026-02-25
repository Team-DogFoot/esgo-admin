"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

export interface AiStats {
  todayPipelines: number;
  successRate: number;
  errorSessions: number;
  avgDurationMs: number;
  phaseDistribution: { phase: string; count: number }[];
}

export const getAiStats = createAction(
  { module: "get-ai-stats" },
  async (_session, regionId: string): Promise<AiStats> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      todayPipelines,
      totalPipelines,
      completedPipelines,
      errorSessions,
      avgDuration,
      phaseGroups,
    ] = await Promise.all([
      prisma.pipelineSession.count({
        where: { startedAt: { gte: todayStart } },
      }),
      prisma.pipelineSession.count(),
      prisma.pipelineSession.count({
        where: { completedAt: { not: null } },
      }),
      prisma.pipelineSession.count({
        where: {
          errorCount: { gt: 0 },
          startedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.pipelineSession.aggregate({
        _avg: { durationMs: true },
        where: { completedAt: { not: null } },
      }),
      prisma.pipelineSession.groupBy({
        by: ["currentPhase"],
        where: { completedAt: null },
        _count: { id: true },
      }),
    ]);

    const successRate = totalPipelines > 0
      ? Math.round((completedPipelines / totalPipelines) * 100)
      : 0;

    return {
      todayPipelines,
      successRate,
      errorSessions,
      avgDurationMs: Math.round(avgDuration._avg.durationMs ?? 0),
      phaseDistribution: phaseGroups.map((g) => ({
        phase: g.currentPhase,
        count: g._count.id,
      })),
    };
  },
);
