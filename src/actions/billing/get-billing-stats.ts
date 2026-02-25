"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-billing-stats" });

export interface RecentPaymentItem {
  id: string;
  workspaceName: string;
  amount: number;
  status: string;
  type: string;
  paidAt: Date | null;
  createdAt: Date;
}

export interface BillingStats {
  mrr: number;
  activeSubscriptions: number;
  totalWorkspaces: number;
  conversionRate: number;
  monthlyCreditsConsumed: number;
  pendingOrFailedPayments: number;
  planDistribution: { planCode: string; count: number }[];
  recentPayments: RecentPaymentItem[];
}

export async function getBillingStats(
  regionId: string,
): Promise<ActionResult<BillingStats>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId }, "getBillingStats started");

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeSubscriptionsWithPlan,
      totalWorkspaces,
      monthlyCreditsAgg,
      pendingOrFailedPayments,
      planGroups,
      recentPaymentsRaw,
    ] = await Promise.all([
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        include: { plan: { select: { monthlyPrice: true } } },
      }),
      prisma.workspace.count(),
      prisma.creditLedger.aggregate({
        _sum: { amount: true },
        where: {
          type: "CONSUME",
          createdAt: { gte: monthStart },
        },
      }),
      prisma.payment.count({
        where: { status: { in: ["PENDING", "FAILED"] } },
      }),
      prisma.workspace.groupBy({
        by: ["planCode"],
        _count: { id: true },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          Workspace: { select: { name: true } },
        },
      }),
    ]);

    const mrr = activeSubscriptionsWithPlan.reduce(
      (sum, sub) => sum + sub.plan.monthlyPrice,
      0,
    );
    const activeSubscriptions = activeSubscriptionsWithPlan.length;
    const conversionRate =
      totalWorkspaces > 0
        ? Math.round((activeSubscriptions / totalWorkspaces) * 100 * 10) / 10
        : 0;

    const stats: BillingStats = {
      mrr,
      activeSubscriptions,
      totalWorkspaces,
      conversionRate,
      monthlyCreditsConsumed: Math.abs(monthlyCreditsAgg._sum.amount ?? 0),
      pendingOrFailedPayments,
      planDistribution: planGroups.map((g) => ({
        planCode: g.planCode,
        count: g._count.id,
      })),
      recentPayments: recentPaymentsRaw.map((p) => ({
        id: p.id,
        workspaceName: p.Workspace.name,
        amount: p.amount,
        status: p.status,
        type: p.type,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    };

    log.info(
      { regionId, mrr, activeSubscriptions },
      "getBillingStats succeeded",
    );
    return ok(stats);
  } catch (error) {
    log.error({ err: error, regionId }, "getBillingStats failed");
    return fail("빌링 통계 조회에 실패했습니다.");
  }
}
