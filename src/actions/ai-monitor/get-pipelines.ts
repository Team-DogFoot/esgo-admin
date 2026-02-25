"use server";

import { z } from "zod";
import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

const schema = z.object({
  regionId: z.string(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  phase: z.enum(["PREPROCESSED", "CLASSIFIED", "EXTRACTED"]).optional(),
  status: z.enum(["all", "running", "completed", "error"]).default("all"),
  search: z.string().optional(),
});

export interface PipelineListItem {
  id: string;
  sessionId: string;
  workspaceId: string;
  workspaceName: string;
  documentId: string;
  documentName: string;
  currentPhase: string;
  autoMode: boolean;
  errorCount: number;
  lastError: string | null;
  durationMs: number | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface PaginatedPipelines {
  items: PipelineListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export const getPipelines = createAction(
  { module: "get-pipelines" },
  async (_session, input: z.input<typeof schema>): Promise<PaginatedPipelines> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, page, perPage, phase, status, search } = parsed.data;

    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const where: Record<string, unknown> = {};

    if (phase) {
      where.currentPhase = phase;
    }

    if (status === "running") {
      where.completedAt = null;
      where.errorCount = 0;
    } else if (status === "completed") {
      where.completedAt = { not: null };
    } else if (status === "error") {
      where.errorCount = { gt: 0 };
    }

    if (search) {
      where.OR = [
        { Workspace: { name: { contains: search, mode: "insensitive" } } },
        { Document: { fileName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, sessions] = await Promise.all([
      prisma.pipelineSession.count({ where }),
      prisma.pipelineSession.findMany({
        where,
        include: {
          Workspace: { select: { name: true } },
          Document: { select: { fileName: true } },
        },
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const items: PipelineListItem[] = sessions.map((s) => ({
      id: s.id,
      sessionId: s.sessionId,
      workspaceId: s.workspaceId,
      workspaceName: s.Workspace.name,
      documentId: s.documentId,
      documentName: s.Document.fileName,
      currentPhase: s.currentPhase,
      autoMode: s.autoMode,
      errorCount: s.errorCount,
      lastError: s.lastError,
      durationMs: s.durationMs,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
    }));

    const totalPages = Math.ceil(total / perPage);

    return { items, total, page, perPage, totalPages };
  },
);
