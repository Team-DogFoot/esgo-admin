"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-credit-by-workspace" });

export interface CreditByWorkspaceItem {
  workspaceId: string;
  workspaceName: string;
  totalAmount: number;
}

export async function getCreditByWorkspace(
  regionId: string,
  limit: number = 10,
): Promise<ActionResult<CreditByWorkspaceItem[]>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, limit }, "getCreditByWorkspace started");

  try {
    const groups = await prisma.creditLedger.groupBy({
      by: ["workspaceId"],
      where: { type: "CONSUME" },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "asc" } },
      take: limit,
    });

    const workspaceIds = groups.map((g) => g.workspaceId);
    const workspaces = await prisma.workspace.findMany({
      where: { id: { in: workspaceIds } },
      select: { id: true, name: true },
    });

    const workspaceMap = new Map(workspaces.map((w) => [w.id, w.name]));

    const items: CreditByWorkspaceItem[] = groups.map((g) => ({
      workspaceId: g.workspaceId,
      workspaceName: workspaceMap.get(g.workspaceId) ?? "알 수 없음",
      totalAmount: Math.abs(g._sum.amount ?? 0),
    }));

    log.info({ regionId, count: items.length }, "getCreditByWorkspace succeeded");
    return ok(items);
  } catch (error) {
    log.error({ err: error, regionId }, "getCreditByWorkspace failed");
    return fail("워크스페이스별 크레딧 조회에 실패했습니다.");
  }
}
