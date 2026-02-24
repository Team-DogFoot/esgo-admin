"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
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
  createdAt: Date;
}

interface GetWorkspacesInput {
  regionId: string;
  search?: string;
  planFilter?: string;
}

export async function getWorkspaces(
  input: GetWorkspacesInput,
): Promise<ActionResult<WorkspaceListItem[]>> {
  const region = getRegion(input.regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(input.regionId);

  log.info({ regionId: input.regionId }, "getWorkspaces started");

  try {
    const where = {
      ...(input.search && {
        name: { contains: input.search, mode: "insensitive" as const },
      }),
      ...(input.planFilter && { planCode: input.planFilter as "FREE" | "PRO" }),
    };

    const workspaces = await prisma.workspace.findMany({
      where,
      include: {
        _count: {
          select: { members: true, documents: true },
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
      createdAt: ws.createdAt,
    }));

    log.info({ regionId: input.regionId, count: items.length }, "getWorkspaces succeeded");
    return ok(items);
  } catch (error) {
    log.error({ err: error, regionId: input.regionId }, "getWorkspaces failed");
    return fail("워크스페이스 목록 조회에 실패했습니다.");
  }
}
