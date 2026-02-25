"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient, PlanCode, SubscriptionStatus } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-subscriptions" });

const schema = z.object({
  regionId: z.string(),
  page: z.number().int().min(1).optional().default(1),
  perPage: z.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  planFilter: z.nativeEnum(PlanCode).optional(),
  statusFilter: z.nativeEnum(SubscriptionStatus).optional(),
});

export interface SubscriptionListItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  planCode: string;
  planName: string;
  status: string;
  monthlyPrice: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
  createdAt: Date;
}

export interface PaginatedSubscriptions {
  items: SubscriptionListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function getSubscriptions(
  input: Record<string, unknown>,
): Promise<ActionResult<PaginatedSubscriptions>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId, page, perPage, search, planFilter, statusFilter } =
    parsed.data;
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, page, perPage }, "getSubscriptions started");

  try {
    const where = {
      ...(search && {
        workspace: {
          name: { contains: search, mode: "insensitive" as const },
        },
      }),
      ...(planFilter && {
        plan: { code: planFilter },
      }),
      ...(statusFilter && { status: statusFilter }),
    };

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        include: {
          workspace: { select: { name: true } },
          plan: { select: { code: true, name: true, monthlyPrice: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const items: SubscriptionListItem[] = subscriptions.map((sub) => ({
      id: sub.id,
      workspaceId: sub.workspaceId,
      workspaceName: sub.workspace.name,
      planCode: sub.plan.code,
      planName: sub.plan.name,
      status: sub.status,
      monthlyPrice: sub.plan.monthlyPrice,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      canceledAt: sub.canceledAt,
      createdAt: sub.createdAt,
    }));

    const result: PaginatedSubscriptions = {
      items,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };

    log.info(
      { regionId, total, page },
      "getSubscriptions succeeded",
    );
    return ok(result);
  } catch (error) {
    log.error({ err: error, regionId }, "getSubscriptions failed");
    return fail("구독 목록 조회에 실패했습니다.");
  }
}
