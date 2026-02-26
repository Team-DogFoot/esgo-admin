"use server";

import { z } from "zod";
import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";
import type { AiProvider } from "@/lib/prisma";

const schema = z.object({
  regionId: z.string(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  provider: z.enum(["GEMINI", "DOCUMENT_AI", "CLOUD_VISION"]).optional(),
  success: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
});

export interface UsageLogItem {
  id: string;
  provider: AiProvider;
  operation: string;
  model: string | null;
  totalTokens: number | null;
  pageCount: number | null;
  imageCount: number | null;
  estimatedCostUsd: number | null;
  durationMs: number | null;
  success: boolean;
  createdAt: Date;
  workspaceName: string;
}

export interface PaginatedUsageLogs {
  items: UsageLogItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export const getUsageLogs = createAction(
  { module: "get-usage-logs" },
  async (_session, input: z.input<typeof schema>): Promise<PaginatedUsageLogs> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, page, perPage, provider, success, search } = parsed.data;

    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const where: Record<string, unknown> = {};

    if (provider) {
      where.provider = provider;
    }

    if (success !== undefined) {
      where.success = success === "true";
    }

    if (search) {
      where.OR = [
        { operation: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { Workspace: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.aiUsageLog.count({ where }),
      prisma.aiUsageLog.findMany({
        where,
        include: {
          Workspace: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const items: UsageLogItem[] = logs.map((log) => ({
      id: log.id,
      provider: log.provider,
      operation: log.operation,
      model: log.model,
      totalTokens: log.totalTokens,
      pageCount: log.pageCount,
      imageCount: log.imageCount,
      estimatedCostUsd: log.estimatedCostUsd,
      durationMs: log.durationMs,
      success: log.success,
      createdAt: log.createdAt,
      workspaceName: log.Workspace.name,
    }));

    const totalPages = Math.ceil(total / perPage);

    return { items, total, page, perPage, totalPages };
  },
);
