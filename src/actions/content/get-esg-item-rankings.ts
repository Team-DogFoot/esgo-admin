"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

export interface EsgItemRanking {
  esgItemCode: string;
  count: number;
}

export interface EsgItemRankings {
  topCompleted: EsgItemRanking[];
  topNotStarted: EsgItemRanking[];
}

export const getEsgItemRankings = createAction(
  { module: "get-esg-item-rankings" },
  async (_session, regionId: string): Promise<EsgItemRankings> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const [completedGroups, notStartedGroups] = await Promise.all([
      prisma.esgSummary.groupBy({
        by: ["esgItemCode"],
        where: { status: "COMPLETED" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.esgSummary.groupBy({
        by: ["esgItemCode"],
        where: { status: "NOT_STARTED" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    return {
      topCompleted: completedGroups.map((g) => ({
        esgItemCode: g.esgItemCode,
        count: g._count.id,
      })),
      topNotStarted: notStartedGroups.map((g) => ({
        esgItemCode: g.esgItemCode,
        count: g._count.id,
      })),
    };
  },
);
