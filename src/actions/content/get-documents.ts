"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-documents" });

const PAGE_SIZE = 20;

const schema = z.object({
  regionId: z.string(),
  page: z.number().int().positive().default(1),
  statusFilter: z
    .enum(["UPLOADED", "PREPROCESSED", "CLASSIFIED", "ANALYZING", "ANALYZED"])
    .optional(),
  hasPipeline: z.boolean().optional(),
  dateRange: z.enum(["this_month", "last_month", "3_months", "all"]).optional(),
  search: z.string().optional(),
});

export interface DocumentListItem {
  id: string;
  fileName: string;
  displayName: string | null;
  workspaceId: string;
  workspaceName: string;
  uploaderName: string | null;
  status: string;
  size: string;
  linkedItemCount: number;
  pipelinePhase: string | null;
  createdAt: Date;
}

export interface PaginatedDocuments {
  items: DocumentListItem[];
  page: number;
  totalPages: number;
  total: number;
}

function getDateRangeStart(range: string | undefined): Date | undefined {
  if (!range || range === "all") return undefined;
  const now = new Date();
  switch (range) {
    case "this_month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "last_month":
      return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    case "3_months":
      return new Date(now.getFullYear(), now.getMonth() - 3, 1);
    default:
      return undefined;
  }
}

export async function getDocuments(
  input: z.input<typeof schema>,
): Promise<ActionResult<PaginatedDocuments>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId, page, statusFilter, hasPipeline, dateRange, search } =
    parsed.data;

  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, page }, "getDocuments started");

  try {
    const dateStart = getDateRangeStart(dateRange);

    const where = {
      ...(statusFilter && { status: statusFilter }),
      ...(hasPipeline !== undefined && {
        PipelineSession: hasPipeline
          ? { some: {} }
          : { none: {} },
      }),
      ...(dateStart && { createdAt: { gte: dateStart } }),
      ...(search && {
        OR: [
          { fileName: { contains: search, mode: "insensitive" as const } },
          {
            workspace: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }),
    };

    const [total, documents] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        include: {
          workspace: { select: { name: true } },
          User: { select: { name: true } },
          _count: { select: { DocumentItemLink: true } },
          PipelineSession: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: { currentPhase: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    const items: DocumentListItem[] = documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      displayName: doc.displayName,
      workspaceId: doc.workspaceId,
      workspaceName: doc.workspace.name,
      uploaderName: doc.User.name,
      status: doc.status,
      size: doc.size.toString(),
      linkedItemCount: doc._count.DocumentItemLink,
      pipelinePhase: doc.PipelineSession[0]?.currentPhase ?? null,
      createdAt: doc.createdAt,
    }));

    const totalPages = Math.ceil(total / PAGE_SIZE);

    log.info(
      { regionId, total, page, totalPages },
      "getDocuments succeeded",
    );
    return ok({ items, page, totalPages, total });
  } catch (error) {
    log.error({ err: error, regionId }, "getDocuments failed");
    return fail("문서 목록 조회에 실패했습니다.");
  }
}
