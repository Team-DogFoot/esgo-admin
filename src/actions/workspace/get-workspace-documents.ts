"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

export interface WorkspaceDocumentItem {
  id: string;
  fileName: string;
  displayName: string | null;
  uploaderName: string | null;
  status: string;
  size: bigint;
  contentType: string | null;
  linkedItemCount: number;
  pipelinePhase: string | null;
  pipelineSessionId: string | null;
  createdAt: Date;
}

export const getWorkspaceDocuments = createAction(
  { module: "get-workspace-documents" },
  async (_session, regionId: string, workspaceId: string): Promise<WorkspaceDocumentItem[]> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const documents = await prisma.document.findMany({
      where: { workspaceId },
      include: {
        User: { select: { name: true } },
        _count: { select: { DocumentItemLink: true } },
        PipelineSession: {
          select: { id: true, currentPhase: true },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return documents.map((doc) => {
      const latestPipeline = doc.PipelineSession[0] ?? null;
      return {
        id: doc.id,
        fileName: doc.fileName,
        displayName: doc.displayName,
        uploaderName: doc.User.name,
        status: doc.status,
        size: doc.size,
        contentType: doc.contentType,
        linkedItemCount: doc._count.DocumentItemLink,
        pipelinePhase: latestPipeline?.currentPhase ?? null,
        pipelineSessionId: latestPipeline?.id ?? null,
        createdAt: doc.createdAt,
      };
    });
  },
);
