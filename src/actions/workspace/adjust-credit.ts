"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "adjust-credit" });

const schema = z.object({
  regionId: z.string(),
  workspaceId: z.string(),
  amount: z.number().int().refine((v) => v !== 0, "0은 입력할 수 없습니다."),
  reason: z.string().min(1, "사유를 입력하세요."),
});

export async function adjustCredit(
  input: z.infer<typeof schema>,
): Promise<ActionResult<{ newBalance: number }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId, workspaceId, amount, reason } = parsed.data;
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, workspaceId, amount, reason }, "adjustCredit started");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: { creditBalance: true },
      });
      if (!ws) throw new Error("워크스페이스를 찾을 수 없습니다.");

      const newBalance = ws.creditBalance + amount;
      if (newBalance < 0) throw new Error("잔액이 부족합니다.");

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
          reason: `[어드민] ${reason}`,
        },
      });

      return { newBalance };
    });

    revalidatePath(`/${regionId}/workspaces/${workspaceId}`);
    log.info({ regionId, workspaceId, newBalance: result.newBalance }, "adjustCredit succeeded");
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "크레딧 조정에 실패했습니다.";
    log.error({ err: error, regionId, workspaceId }, "adjustCredit failed");
    return fail(message);
  }
}
