"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient, PlanCode } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-esg-overview" });

const PAGE_SIZE = 20;

const schema = z.object({
  regionId: z.string(),
  page: z.number().int().positive().default(1),
  completionRange: z.enum(["0-25", "25-50", "50-75", "75-100"]).optional(),
  planFilter: z.nativeEnum(PlanCode).optional(),
  search: z.string().optional(),
});

export interface EsgOverviewItem {
  workspaceId: string;
  workspaceName: string;
  planCode: string;
  totalItems: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
  aiRate: number;
  lastUpdated: Date | null;
}

export interface PaginatedEsgOverview {
  items: EsgOverviewItem[];
  page: number;
  totalPages: number;
  total: number;
}

function buildOverviewItem(ws: {
  id: string;
  name: string;
  planCode: string;
  esgSummaries: { status: string; source: string | null; updatedAt: Date }[];
}): EsgOverviewItem {
  const totalItems = ws.esgSummaries.length;
  const completed = ws.esgSummaries.filter(
    (s) => s.status === "COMPLETED",
  ).length;
  const inProgress = ws.esgSummaries.filter(
    (s) => s.status === "IN_PROGRESS",
  ).length;
  const notStarted = ws.esgSummaries.filter(
    (s) => s.status === "NOT_STARTED",
  ).length;
  const completionRate =
    totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;

  const withSource = ws.esgSummaries.filter((s) => s.source !== null);
  const aiCount = ws.esgSummaries.filter((s) => s.source === "AI").length;
  const aiRate =
    withSource.length > 0
      ? Math.round((aiCount / withSource.length) * 100)
      : 0;

  const lastUpdated =
    ws.esgSummaries.length > 0
      ? ws.esgSummaries.reduce(
          (latest: Date, s) =>
            s.updatedAt > latest ? s.updatedAt : latest,
          ws.esgSummaries[0].updatedAt,
        )
      : null;

  return {
    workspaceId: ws.id,
    workspaceName: ws.name,
    planCode: ws.planCode,
    totalItems,
    completed,
    inProgress,
    notStarted,
    completionRate,
    aiRate,
    lastUpdated,
  };
}

export async function getEsgOverview(
  input: Record<string, unknown>,
): Promise<ActionResult<PaginatedEsgOverview>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId, page, completionRange, planFilter, search } = parsed.data;

  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, page }, "getEsgOverview started");

  try {
    const workspaceWhere = {
      ...(planFilter && { planCode: planFilter }),
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
    };

    const wsSelect = {
      id: true,
      name: true,
      planCode: true,
      esgSummaries: {
        select: { status: true, source: true, updatedAt: true },
      },
    } as const;

    if (!completionRange) {
      // DB-level pagination — avoid loading all workspaces
      const [total, workspaces] = await Promise.all([
        prisma.workspace.count({ where: workspaceWhere }),
        prisma.workspace.findMany({
          where: workspaceWhere,
          select: wsSelect,
          orderBy: { name: "asc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
      ]);

      const items = workspaces.map(buildOverviewItem);
      const totalPages = Math.ceil(total / PAGE_SIZE);

      log.info({ regionId, total, page }, "getEsgOverview succeeded");
      return ok({ items, page, totalPages, total });
    }

    // completionRange filter requires computing rates — in-memory filtering
    const allWorkspaces = await prisma.workspace.findMany({
      where: workspaceWhere,
      select: wsSelect,
      orderBy: { name: "asc" },
    });

    const overviewItems = allWorkspaces.map(buildOverviewItem);
    const [min, max] = completionRange.split("-").map(Number);
    const filtered = overviewItems.filter(
      (item) => item.completionRate >= min && item.completionRate < max,
    );

    const total = filtered.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    log.info({ regionId, total, page }, "getEsgOverview succeeded");
    return ok({ items, page, totalPages, total });
  } catch (error) {
    log.error({ err: error, regionId }, "getEsgOverview failed");
    return fail("ESG 현황 조회에 실패했습니다.");
  }
}
