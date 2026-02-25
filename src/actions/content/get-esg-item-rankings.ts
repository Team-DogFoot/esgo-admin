"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-esg-item-rankings" });

export interface EsgItemRanking {
  esgItemCode: string;
  count: number;
}

export interface EsgItemRankings {
  topCompleted: EsgItemRanking[];
  topNotStarted: EsgItemRanking[];
}

export async function getEsgItemRankings(
  regionId: string,
): Promise<ActionResult<EsgItemRankings>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId }, "getEsgItemRankings started");

  try {
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

    const rankings: EsgItemRankings = {
      topCompleted: completedGroups.map((g) => ({
        esgItemCode: g.esgItemCode,
        count: g._count.id,
      })),
      topNotStarted: notStartedGroups.map((g) => ({
        esgItemCode: g.esgItemCode,
        count: g._count.id,
      })),
    };

    log.info({ regionId }, "getEsgItemRankings succeeded");
    return ok(rankings);
  } catch (error) {
    log.error({ err: error, regionId }, "getEsgItemRankings failed");
    return fail("ESG 항목 랭킹 조회에 실패했습니다.");
  }
}
