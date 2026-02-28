"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/lib/action";
import { getPrismaClient, PlanCode } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "manage-trial" });

const schema = z.object({
  regionId: z.string(),
  workspaceId: z.string(),
  action: z.enum(["start", "extend", "end"]),
  trialEndsAt: z.string().datetime().optional(),
});

export interface ManageTrialResult {
  trialEndsAt: Date | null;
  trialEndedAt: Date | null;
}

export const manageTrial = createAction(
  { module: "manage-trial" },
  async (session, input: Record<string, unknown>): Promise<ManageTrialResult> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, workspaceId, action } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    let result: { trialEndsAt: Date | null; trialEndedAt: Date | null };

    switch (action) {
      case "start": {
        const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const existing = await prisma.subscription.findUnique({
          where: { workspaceId },
        });

        if (existing) {
          result = await prisma.subscription.update({
            where: { workspaceId },
            data: {
              trialEndsAt,
              trialEndedAt: null,
            },
            select: { trialEndsAt: true, trialEndedAt: true },
          });
        } else {
          const freePlan = await prisma.plan.findUnique({
            where: { code: PlanCode.FREE },
          });
          if (!freePlan) throw new ValidationError("FREE 플랜을 찾을 수 없습니다.");

          result = await prisma.subscription.create({
            data: {
              workspaceId,
              planId: freePlan.id,
              status: "ACTIVE",
              currentPeriodStart: new Date(),
              currentPeriodEnd: trialEndsAt,
              trialEndsAt,
              updatedAt: new Date(),
            },
            select: { trialEndsAt: true, trialEndedAt: true },
          });
        }
        break;
      }
      case "extend": {
        if (!parsed.data.trialEndsAt) throw new ValidationError("연장할 날짜를 지정하세요.");

        result = await prisma.subscription.update({
          where: { workspaceId },
          data: {
            trialEndsAt: new Date(parsed.data.trialEndsAt),
          },
          select: { trialEndsAt: true, trialEndedAt: true },
        });
        break;
      }
      case "end": {
        result = await prisma.subscription.update({
          where: { workspaceId },
          data: {
            trialEndedAt: new Date(),
          },
          select: { trialEndsAt: true, trialEndedAt: true },
        });
        break;
      }
    }

    log.info({ workspaceId, action, admin: session.user?.email }, "트라이얼 관리");

    revalidatePath(`/${regionId}/workspaces/${workspaceId}`);

    return result;
  },
);
