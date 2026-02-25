"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient, PlanCode } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-workspaces" });

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

export async function getWorkspaces(
  input: Record<string, unknown>,
): Promise<ActionResult<WorkspaceListItem[]>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId, search, planFilter } = parsed.data;
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);

  log.info({ regionId }, "getWorkspaces started");

  try {
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

    const items: WorkspaceListItem[] = workspaces.map((ws) => ({
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

    log.info({ regionId, count: items.length }, "getWorkspaces succeeded");
    return ok(items);
  } catch (error) {
    log.error({ err: error, regionId }, "getWorkspaces failed");
    return fail("워크스페이스 목록 조회에 실패했습니다.");
  }
}
