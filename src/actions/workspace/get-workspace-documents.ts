"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-workspace-documents" });

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

export async function getWorkspaceDocuments(
  regionId: string,
  workspaceId: string,
): Promise<ActionResult<WorkspaceDocumentItem[]>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, workspaceId }, "getWorkspaceDocuments started");

  try {
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

    const items: WorkspaceDocumentItem[] = documents.map((doc) => {
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

    log.info({ regionId, workspaceId, count: items.length }, "getWorkspaceDocuments succeeded");
    return ok(items);
  } catch (error) {
    log.error({ err: error, regionId, workspaceId }, "getWorkspaceDocuments failed");
    return fail("문서 목록 조회에 실패했습니다.");
  }
}
