"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

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

export const getPipelineErrors = createAction(
  { module: "get-pipeline-errors" },
  async (_session, regionId: string, limit: number = 10): Promise<PipelineErrorItem[]> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const sessions = await prisma.pipelineSession.findMany({
      where: { errorCount: { gt: 0 } },
      include: {
        Workspace: { select: { name: true } },
        Document: { select: { fileName: true } },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return sessions.map((s) => ({
      id: s.id,
      sessionId: s.sessionId,
      workspaceName: s.Workspace.name,
      documentName: s.Document.fileName,
      currentPhase: s.currentPhase,
      errorCount: s.errorCount,
      lastError: s.lastError,
      startedAt: s.startedAt,
    }));
  },
);
