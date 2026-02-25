"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-pipeline-errors" });

export interface PipelineErrorItem {
  id: string;
  sessionId: string;
  workspaceName: string;
  documentName: string;
  currentPhase: string;
  errorCount: number;
  lastError: string | null;
  startedAt: Date;
}

export async function getPipelineErrors(
  regionId: string,
  limit: number = 10,
): Promise<ActionResult<PipelineErrorItem[]>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, limit }, "getPipelineErrors started");

  try {
    const sessions = await prisma.pipelineSession.findMany({
      where: { errorCount: { gt: 0 } },
      include: {
        Workspace: { select: { name: true } },
        Document: { select: { fileName: true } },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    const items: PipelineErrorItem[] = sessions.map((s) => ({
      id: s.id,
      sessionId: s.sessionId,
      workspaceName: s.Workspace.name,
      documentName: s.Document.fileName,
      currentPhase: s.currentPhase,
      errorCount: s.errorCount,
      lastError: s.lastError,
      startedAt: s.startedAt,
    }));

    log.info({ regionId, count: items.length }, "getPipelineErrors succeeded");
    return ok(items);
  } catch (error) {
    log.error({ err: error, regionId }, "getPipelineErrors failed");
    return fail("파이프라인 에러 조회에 실패했습니다.");
  }
}
