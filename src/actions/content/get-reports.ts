"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-reports" });

const PAGE_SIZE = 20;

const schema = z.object({
  regionId: z.string(),
  page: z.number().int().positive().default(1),
  dateRange: z.enum(["this_month", "last_month", "3_months", "all"]).optional(),
  search: z.string().optional(),
});

export interface ReportListItem {
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
  creatorName: string | null;
  generatedAt: Date;
}

export interface PaginatedReports {
  items: ReportListItem[];
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

export async function getReports(
  input: z.input<typeof schema>,
): Promise<ActionResult<PaginatedReports>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId, page, dateRange, search } = parsed.data;

  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, page }, "getReports started");

  try {
    const dateStart = getDateRangeStart(dateRange);

    const where = {
      ...(dateStart && { generatedAt: { gte: dateStart } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          {
            Workspace: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }),
    };

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        include: {
          Workspace: { select: { name: true } },
          User: { select: { name: true } },
        },
        orderBy: { generatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    const items: ReportListItem[] = reports.map((r) => ({
      id: r.id,
      title: r.title,
      workspaceId: r.workspaceId,
      workspaceName: r.Workspace.name,
      creatorName: r.User.name,
      generatedAt: r.generatedAt,
    }));

    const totalPages = Math.ceil(total / PAGE_SIZE);

    log.info({ regionId, total, page }, "getReports succeeded");
    return ok({ items, page, totalPages, total });
  } catch (error) {
    log.error({ err: error, regionId }, "getReports failed");
    return fail("보고서 목록 조회에 실패했습니다.");
  }
}
