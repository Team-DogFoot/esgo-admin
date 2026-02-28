"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

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

export const getWorkspaceSubscription = createAction(
  { module: "get-workspace-subscription" },
  async (_session, regionId: string, workspaceId: string): Promise<WorkspaceSubscriptionData> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId },
      include: {
        plan: {
          select: {
            code: true,
            name: true,
            monthlyPrice: true,
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

    return { subscription: subscriptionInfo, payments: paymentItems };
  },
);
