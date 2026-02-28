"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "batch-adjust-quota" });

const schema = z.object({
  regionId: z.string(),
  workspaceIds: z.array(z.string()).min(1),
  bonusAnalysis: z.number().int().default(0),
  bonusReport: z.number().int().default(0),
  reason: z.string().min(1),
});

export const batchAdjustQuota = createAction(
  { module: "batch-adjust-quota" },
  async (session, input: Record<string, unknown>): Promise<{ adjustedCount: number }> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, workspaceIds, bonusAnalysis, bonusReport, reason } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    if (bonusAnalysis === 0 && bonusReport === 0) {
      throw new ValidationError("조정할 건수를 입력하세요.");
    }

    const prisma = getPrismaClient(regionId);

    const result = await prisma.workspace.updateMany({
      where: { id: { in: workspaceIds } },
      data: {
        bonusAnalysis: { increment: bonusAnalysis },
        bonusReport: { increment: bonusReport },
      },
    });

    log.info({ workspaceCount: workspaceIds.length, bonusAnalysis, bonusReport, reason, admin: session.user?.email }, "일괄 건수 조정");

    revalidatePath(`/${regionId}/workspaces`);

    return { adjustedCount: result.count };
  },
);
