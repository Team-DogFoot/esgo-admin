"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "batch-adjust-credits" });

const schema = z.object({
  regionId: z.string(),
  workspaceIds: z.array(z.string()).min(1, "워크스페이스를 선택하세요."),
  amount: z.number().int().refine((v) => v !== 0, "0은 입력할 수 없습니다."),
  reason: z.string().min(1, "사유를 입력하세요."),
});

export async function batchAdjustCredits(
  input: z.infer<typeof schema>,
): Promise<ActionResult<{ adjustedCount: number }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId, workspaceIds, amount, reason } = parsed.data;
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, workspaceIds, amount, reason }, "batchAdjustCredits started");

  try {
    const result = await prisma.$transaction(async (tx) => {
      let adjustedCount = 0;

      for (const workspaceId of workspaceIds) {
        const ws = await tx.workspace.findUnique({
          where: { id: workspaceId },
          select: { creditBalance: true },
        });
        if (!ws) {
          log.warn({ workspaceId }, "workspace not found, skipping");
          continue;
        }

        const newBalance = ws.creditBalance + amount;
        if (newBalance < 0) {
          log.warn({ workspaceId, currentBalance: ws.creditBalance, amount }, "insufficient balance, skipping");
          continue;
        }

        await tx.workspace.update({
          where: { id: workspaceId },
          data: { creditBalance: newBalance },
        });

        await tx.creditLedger.create({
          data: {
            workspaceId,
            amount,
            balance: newBalance,
            type: "ADMIN",
            reason: `[어드민 일괄] ${reason}`,
          },
        });

        adjustedCount++;
      }

      return { adjustedCount };
    });

    revalidatePath(`/${regionId}/workspaces`);
    log.info({ regionId, adjustedCount: result.adjustedCount }, "batchAdjustCredits succeeded");
    return ok(result);
  } catch (error) {
    log.error({ err: error, regionId }, "batchAdjustCredits failed");
    return fail("크레딧 일괄 조정에 실패했습니다.");
  }
}
