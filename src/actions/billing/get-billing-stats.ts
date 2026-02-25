"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

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

export const getBillingStats = createAction(
  { module: "get-billing-stats" },
  async (_session, regionId: string): Promise<BillingStats> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

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

    return {
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
  },
);
