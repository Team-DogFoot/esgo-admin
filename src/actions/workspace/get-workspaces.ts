"use server";

import { z } from "zod";
import { createAction } from "@/lib/action";
import { getPrismaClient, PlanCode } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

export interface WorkspaceListItem {
  id: string;
  name: string;
  planCode: string;
  creditBalance: number;
  memberCount: number;
  documentCount: number;
  esgCompletedCount: number;
  esgTotalCount: number;
  createdAt: Date;
}

const schema = z.object({
  regionId: z.string(),
  search: z.string().optional(),
  planFilter: z.nativeEnum(PlanCode).optional(),
});

export const getWorkspaces = createAction(
  { module: "get-workspaces" },
  async (_session, input: Record<string, unknown>): Promise<WorkspaceListItem[]> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, search, planFilter } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const where = {
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
      ...(planFilter && { planCode: planFilter }),
    };

    const workspaces = await prisma.workspace.findMany({
      where,
      include: {
        _count: {
          select: { members: true, documents: true, esgSummaries: true },
        },
        esgSummaries: {
          where: { status: "COMPLETED" },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      planCode: ws.planCode,
      creditBalance: ws.creditBalance,
      memberCount: ws._count.members,
      documentCount: ws._count.documents,
      esgCompletedCount: ws.esgSummaries.length,
      esgTotalCount: ws._count.esgSummaries,
      createdAt: ws.createdAt,
    }));
  },
);
