"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-workspace-subscription" });

export interface SubscriptionInfo {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
  plan: {
    code: string;
    name: string;
    monthlyPrice: number;
    initialCredits: number;
    monthlyCredits: number;
    maxMembers: number;
    maxDocuments: number;
  };
}

export interface PaymentItem {
  id: string;
  type: string;
  amount: number;
  credits: number | null;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
}

export interface WorkspaceSubscriptionData {
  subscription: SubscriptionInfo | null;
  payments: PaymentItem[];
}

export async function getWorkspaceSubscription(
  regionId: string,
  workspaceId: string,
): Promise<ActionResult<WorkspaceSubscriptionData>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, workspaceId }, "getWorkspaceSubscription started");

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId },
      include: {
        plan: {
          select: {
            code: true,
            name: true,
            monthlyPrice: true,
            initialCredits: true,
            monthlyCredits: true,
            maxMembers: true,
            maxDocuments: true,
          },
        },
      },
    });

    const payments = await prisma.payment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const subscriptionInfo: SubscriptionInfo | null = subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          canceledAt: subscription.canceledAt,
          plan: {
            code: subscription.plan.code,
            name: subscription.plan.name,
            monthlyPrice: subscription.plan.monthlyPrice,
            initialCredits: subscription.plan.initialCredits,
            monthlyCredits: subscription.plan.monthlyCredits,
            maxMembers: subscription.plan.maxMembers,
            maxDocuments: subscription.plan.maxDocuments,
          },
        }
      : null;

    const paymentItems: PaymentItem[] = payments.map((p) => ({
      id: p.id,
      type: p.type,
      amount: p.amount,
      credits: p.credits,
      status: p.status,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }));

    log.info({ regionId, workspaceId }, "getWorkspaceSubscription succeeded");
    return ok({ subscription: subscriptionInfo, payments: paymentItems });
  } catch (error) {
    log.error({ err: error, regionId, workspaceId }, "getWorkspaceSubscription failed");
    return fail("구독 정보 조회에 실패했습니다.");
  }
}
