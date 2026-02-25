"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-workspace-esg" });

export interface EsgSummaryItem {
  id: string;
  esgItemCode: string;
  status: string;
  source: string | null;
  completionRate: number;
  filledFields: number;
  totalFields: number;
  locked: boolean;
  updatedAt: Date;
}

export interface CategoryCompletion {
  category: string;
  total: number;
  completed: number;
  inProgress: number;
  rate: number;
}

export interface WorkspaceEsgData {
  summaries: EsgSummaryItem[];
  overall: CategoryCompletion;
  categories: CategoryCompletion[];
}

function getCategoryPrefix(code: string): string {
  if (code.startsWith("E")) return "E";
  if (code.startsWith("S")) return "S";
  if (code.startsWith("G")) return "G";
  return "기타";
}

function computeCategory(label: string, items: EsgSummaryItem[]): CategoryCompletion {
  const total = items.length;
  const completed = items.filter((s) => s.status === "COMPLETED").length;
  const inProgress = items.filter((s) => s.status === "IN_PROGRESS").length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { category: label, total, completed, inProgress, rate };
}

export async function getWorkspaceEsg(
  regionId: string,
  workspaceId: string,
): Promise<ActionResult<WorkspaceEsgData>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, workspaceId }, "getWorkspaceEsg started");

  try {
    const esgSummaries = await prisma.esgSummary.findMany({
      where: { workspaceId },
      orderBy: { esgItemCode: "asc" },
    });

    const summaries: EsgSummaryItem[] = esgSummaries.map((s) => ({
      id: s.id,
      esgItemCode: s.esgItemCode,
      status: s.status,
      source: s.source,
      completionRate: s.completionRate,
      filledFields: s.filledFields,
      totalFields: s.totalFields,
      locked: s.locked,
      updatedAt: s.updatedAt,
    }));

    const grouped: Record<string, EsgSummaryItem[]> = {};
    for (const s of summaries) {
      const prefix = getCategoryPrefix(s.esgItemCode);
      if (!grouped[prefix]) grouped[prefix] = [];
      grouped[prefix].push(s);
    }

    const categories: CategoryCompletion[] = [];
    for (const cat of ["E", "S", "G"]) {
      categories.push(computeCategory(cat, grouped[cat] ?? []));
    }

    const overall = computeCategory("전체", summaries);

    log.info({ regionId, workspaceId, count: summaries.length }, "getWorkspaceEsg succeeded");
    return ok({ summaries, overall, categories });
  } catch (error) {
    log.error({ err: error, regionId, workspaceId }, "getWorkspaceEsg failed");
    return fail("ESG 데이터 조회에 실패했습니다.");
  }
}
