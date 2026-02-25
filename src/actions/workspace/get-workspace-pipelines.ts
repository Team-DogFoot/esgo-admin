"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-workspace-pipelines" });

export interface WorkspacePipelineItem {
  id: string;
  sessionId: string;
  documentId: string;
  fileName: string;
  currentPhase: string;
  autoMode: boolean;
  errorCount: number;
  lastError: string | null;
  durationMs: number | null;
  startedAt: Date;
  completedAt: Date | null;
}

export async function getWorkspacePipelines(
  regionId: string,
  workspaceId: string,
): Promise<ActionResult<WorkspacePipelineItem[]>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, workspaceId }, "getWorkspacePipelines started");

  try {
    const sessions = await prisma.pipelineSession.findMany({
      where: { workspaceId },
      include: {
        Document: { select: { fileName: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    const items: WorkspacePipelineItem[] = sessions.map((s) => ({
      id: s.id,
      sessionId: s.sessionId,
      documentId: s.documentId,
      fileName: s.Document.fileName,
      currentPhase: s.currentPhase,
      autoMode: s.autoMode,
      errorCount: s.errorCount,
      lastError: s.lastError,
      durationMs: s.durationMs,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
    }));

    log.info({ regionId, workspaceId, count: items.length }, "getWorkspacePipelines succeeded");
    return ok(items);
  } catch (error) {
    log.error({ err: error, regionId, workspaceId }, "getWorkspacePipelines failed");
    return fail("파이프라인 세션 조회에 실패했습니다.");
  }
}
