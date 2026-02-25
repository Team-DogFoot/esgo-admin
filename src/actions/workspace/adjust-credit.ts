"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError, NotFoundError } from "@/lib/errors";

const schema = z.object({
  regionId: z.string(),
  workspaceId: z.string(),
  amount: z.number().int().refine((v) => v !== 0, "0은 입력할 수 없습니다."),
  reason: z.string().min(1, "사유를 입력하세요."),
});

export const adjustCredit = createAction(
  { module: "adjust-credit" },
  async (_session, input: z.infer<typeof schema>): Promise<{ newBalance: number }> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, workspaceId, amount, reason } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const result = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: { creditBalance: true },
      });
      if (!ws) throw new NotFoundError("워크스페이스");

      const newBalance = ws.creditBalance + amount;
      if (newBalance < 0) throw new ValidationError("잔액이 부족합니다.");

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
    return result;
  },
);
