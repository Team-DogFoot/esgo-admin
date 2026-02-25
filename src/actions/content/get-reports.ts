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

export const getReports = createAction(
  { module: "get-reports" },
  async (_session, input: z.input<typeof schema>): Promise<PaginatedReports> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, page, dateRange, search } = parsed.data;

    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const dateFilter = getDateRangeFilter(dateRange);

    const where = {
      ...(dateFilter && { generatedAt: dateFilter }),
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

    return { items, page, totalPages, total };
  },
);
