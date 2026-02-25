"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const batchLog = logger.child({ module: "batch-adjust-credits" });

const schema = z.object({
  regionId: z.string(),
  workspaceIds: z.array(z.string()).min(1, "워크스페이스를 선택하세요."),
  amount: z.number().int().refine((v) => v !== 0, "0은 입력할 수 없습니다."),
  reason: z.string().min(1, "사유를 입력하세요."),
});

export const batchAdjustCredits = createAction(
  { module: "batch-adjust-credits" },
  async (_session, input: z.infer<typeof schema>): Promise<{ adjustedCount: number }> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, workspaceIds, amount, reason } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const result = await prisma.$transaction(async (tx) => {
      let adjustedCount = 0;

      for (const workspaceId of workspaceIds) {
        const ws = await tx.workspace.findUnique({
          where: { id: workspaceId },
          select: { creditBalance: true },
        });
        if (!ws) {
          batchLog.warn({ workspaceId }, "workspace not found, skipping");
          continue;
        }

        const newBalance = ws.creditBalance + amount;
        if (newBalance < 0) {
          batchLog.warn({ workspaceId, currentBalance: ws.creditBalance, amount }, "insufficient balance, skipping");
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
    return result;
  },
);
