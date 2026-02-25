"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

export interface CreditByWorkspaceItem {
  workspaceId: string;
  workspaceName: string;
  totalAmount: number;
}

export const getCreditByWorkspace = createAction(
  { module: "get-credit-by-workspace" },
  async (_session, regionId: string, limit: number = 10): Promise<CreditByWorkspaceItem[]> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

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

    return groups.map((g) => ({
      workspaceId: g.workspaceId,
      workspaceName: workspaceMap.get(g.workspaceId) ?? "알 수 없음",
      totalAmount: Math.abs(g._sum.amount ?? 0),
    }));
  },
);
