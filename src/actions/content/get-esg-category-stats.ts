"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-esg-category-stats" });

export interface EsgCategoryStat {
  category: string;
  totalItems: number;
  completedCount: number;
  averageCompletionRate: number;
}

function getCategoryName(prefix: string): string {
  switch (prefix) {
    case "E":
      return "환경";
    case "S":
      return "사회";
    case "G":
      return "지배구조";
    default:
      return "기타";
  }
}

function getCategoryPrefix(esgItemCode: string): string {
  const first = esgItemCode.charAt(0).toUpperCase();
  if (first === "E" || first === "S" || first === "G") return first;
  return "OTHER";
}

export async function getEsgCategoryStats(
  regionId: string,
): Promise<ActionResult<EsgCategoryStat[]>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId }, "getEsgCategoryStats started");

  try {
    const allSummaries = await prisma.esgSummary.findMany({
      select: {
        esgItemCode: true,
        status: true,
        completionRate: true,
      },
    });

    const groups = new Map<
      string,
      { total: number; completed: number; completionRateSum: number }
    >();

    for (const summary of allSummaries) {
      const prefix = getCategoryPrefix(summary.esgItemCode);
      const existing = groups.get(prefix) ?? {
        total: 0,
        completed: 0,
        completionRateSum: 0,
      };
      existing.total += 1;
      if (summary.status === "COMPLETED") existing.completed += 1;
      existing.completionRateSum += summary.completionRate;
      groups.set(prefix, existing);
    }

    const ORDER = ["E", "S", "G", "OTHER"];
    const stats: EsgCategoryStat[] = ORDER.filter((prefix) =>
      groups.has(prefix),
    ).map((prefix) => {
      const g = groups.get(prefix)!;
      return {
        category: getCategoryName(prefix),
        totalItems: g.total,
        completedCount: g.completed,
        averageCompletionRate:
          g.total > 0 ? Math.round(g.completionRateSum / g.total) : 0,
      };
    });

    log.info({ regionId, categories: stats.length }, "getEsgCategoryStats succeeded");
    return ok(stats);
  } catch (error) {
    log.error({ err: error, regionId }, "getEsgCategoryStats failed");
    return fail("ESG 카테고리 통계 조회에 실패했습니다.");
  }
}
