"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

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

export const getWorkspacePipelines = createAction(
  { module: "get-workspace-pipelines" },
  async (_session, regionId: string, workspaceId: string): Promise<WorkspacePipelineItem[]> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const sessions = await prisma.pipelineSession.findMany({
      where: { workspaceId },
      include: {
        Document: { select: { fileName: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    return sessions.map((s) => ({
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
  },
);
