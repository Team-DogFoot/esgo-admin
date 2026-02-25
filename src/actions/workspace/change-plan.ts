"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { getPrismaClient, PlanCode } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

const schema = z.object({
  regionId: z.string(),
  workspaceId: z.string(),
  planCode: z.nativeEnum(PlanCode),
});

export const changePlan = createAction(
  { module: "change-plan" },
  async (_session, input: Record<string, unknown>): Promise<{ planCode: string }> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, workspaceId, planCode } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { planCode },
    });

    revalidatePath(`/${regionId}/workspaces/${workspaceId}`);
    return { planCode };
  },
);
