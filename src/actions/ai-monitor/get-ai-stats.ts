"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-ai-stats" });

export interface AiStats {
  todayPipelines: number;
  successRate: number;
  errorSessions: number;
  avgDurationMs: number;
  phaseDistribution: { phase: string; count: number }[];
}

export async function getAiStats(regionId: string): Promise<ActionResult<AiStats>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId }, "getAiStats started");

  try {
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

    const stats: AiStats = {
      todayPipelines,
      successRate,
      errorSessions,
      avgDurationMs: Math.round(avgDuration._avg.durationMs ?? 0),
      phaseDistribution: phaseGroups.map((g) => ({
        phase: g.currentPhase,
        count: g._count.id,
      })),
    };

    log.info({ regionId, todayPipelines, successRate }, "getAiStats succeeded");
    return ok(stats);
  } catch (error) {
    log.error({ err: error, regionId }, "getAiStats failed");
    return fail("AI 통계 조회에 실패했습니다.");
  }
}
