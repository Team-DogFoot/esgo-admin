"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "change-plan" });

const schema = z.object({
  regionId: z.string(),
  workspaceId: z.string(),
  planCode: z.enum(["FREE", "PRO"]),
});

export async function changePlan(
  input: z.infer<typeof schema>,
): Promise<ActionResult<{ planCode: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId, workspaceId, planCode } = parsed.data;
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, workspaceId, planCode }, "changePlan started");

  try {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { planCode },
    });

    revalidatePath(`/${regionId}/workspaces/${workspaceId}`);
    log.info({ regionId, workspaceId, planCode }, "changePlan succeeded");
    return ok({ planCode });
  } catch (error) {
    log.error({ err: error, regionId, workspaceId }, "changePlan failed");
    return fail("플랜 변경에 실패했습니다.");
  }
}
