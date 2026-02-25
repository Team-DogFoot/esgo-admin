"use server";

import { z } from "zod";
import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { getDateRangeFilter } from "@/lib/date-range";
import { ValidationError } from "@/lib/errors";

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

export const getDocuments = createAction(
  { module: "get-documents" },
  async (_session, input: z.input<typeof schema>): Promise<PaginatedDocuments> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, page, statusFilter, hasPipeline, dateRange, search } =
      parsed.data;

    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const dateFilter = getDateRangeFilter(dateRange);

    const where = {
      ...(statusFilter && { status: statusFilter }),
      ...(hasPipeline !== undefined && {
        PipelineSession: hasPipeline
          ? { some: {} }
          : { none: {} },
      }),
      ...(dateFilter && { createdAt: dateFilter }),
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

    return { items, page, totalPages, total };
  },
);
