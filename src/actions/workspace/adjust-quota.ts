"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "adjust-quota" });

const schema = z.object({
  regionId: z.string(),
  workspaceId: z.string(),
  mode: z.enum(["add_bonus", "reset_usage", "direct_set"]),
  bonusAnalysis: z.number().int().optional(),
  bonusReport: z.number().int().optional(),
  analysisUsed: z.number().int().min(0).optional(),
  reportUsed: z.number().int().min(0).optional(),
  reason: z.string().min(1),
});

export interface AdjustQuotaResult {
  analysisUsed: number;
  reportUsed: number;
  bonusAnalysis: number;
  bonusReport: number;
}

export const adjustQuota = createAction(
  { module: "adjust-quota" },
  async (session, input: Record<string, unknown>): Promise<AdjustQuotaResult> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, workspaceId, mode, reason } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    let updated;

    switch (mode) {
      case "add_bonus": {
        updated = await prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            bonusAnalysis: { increment: parsed.data.bonusAnalysis ?? 0 },
            bonusReport: { increment: parsed.data.bonusReport ?? 0 },
          },
        });
        break;
      }
      case "reset_usage": {
        updated = await prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            analysisUsed: 0,
            reportUsed: 0,
            usagePeriodStart: new Date(),
          },
        });
        break;
      }
      case "direct_set": {
        if ((parsed.data.bonusAnalysis !== undefined && parsed.data.bonusAnalysis < 0) ||
            (parsed.data.bonusReport !== undefined && parsed.data.bonusReport < 0)) {
          throw new ValidationError("직접 수정 모드에서 보너스 값은 0 이상이어야 합니다.");
        }

        const data: Record<string, number> = {};
        if (parsed.data.analysisUsed !== undefined) data.analysisUsed = parsed.data.analysisUsed;
        if (parsed.data.reportUsed !== undefined) data.reportUsed = parsed.data.reportUsed;
        if (parsed.data.bonusAnalysis !== undefined) data.bonusAnalysis = parsed.data.bonusAnalysis;
        if (parsed.data.bonusReport !== undefined) data.bonusReport = parsed.data.bonusReport;

        updated = await prisma.workspace.update({
          where: { id: workspaceId },
          data,
        });
        break;
      }
    }

    log.info({ workspaceId, mode, reason, admin: session.user?.email }, "건수 조정");

    revalidatePath(`/${regionId}/workspaces/${workspaceId}`);

    return {
      analysisUsed: updated.analysisUsed,
      reportUsed: updated.reportUsed,
      bonusAnalysis: updated.bonusAnalysis,
      bonusReport: updated.bonusReport,
    };
  },
);
