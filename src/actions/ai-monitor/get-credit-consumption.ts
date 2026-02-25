"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";
import type { DailyConsumption } from "@/types/credit";

const log = logger.child({ module: "ai-monitor/get-credit-consumption" });

const schema = z.object({
  regionId: z.string(),
  days: z.number().int().min(1).max(365).default(7),
});

export async function getCreditConsumption(
  input: z.input<typeof schema>,
): Promise<ActionResult<DailyConsumption[]>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId, days } = parsed.data;
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, days }, "getCreditConsumption started");

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const ledgers = await prisma.creditLedger.findMany({
      where: {
        type: "CONSUME",
        createdAt: { gte: startDate },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = new Map<string, number>();

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }

    for (const ledger of ledgers) {
      const key = new Date(ledger.createdAt).toISOString().slice(0, 10);
      const current = dailyMap.get(key) ?? 0;
      dailyMap.set(key, current + Math.abs(ledger.amount));
    }

    const items: DailyConsumption[] = Array.from(dailyMap.entries()).map(
      ([date, amount]) => ({ date, amount }),
    );

    log.info({ regionId, days: items.length }, "getCreditConsumption succeeded");
    return ok(items);
  } catch (error) {
    log.error({ err: error, regionId }, "getCreditConsumption failed");
    return fail("크레딧 소비 추이 조회에 실패했습니다.");
  }
}
