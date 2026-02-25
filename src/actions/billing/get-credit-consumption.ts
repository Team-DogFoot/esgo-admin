"use server";

import { z } from "zod";
import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";
import type { DailyConsumption } from "@/types/credit";

const schema = z.object({
  regionId: z.string(),
  days: z.number().int().min(1).max(365).default(7),
});

export const getCreditConsumption = createAction(
  { module: "get-credit-consumption" },
  async (_session, input: z.input<typeof schema>): Promise<DailyConsumption[]> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, days } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const ledgers = await prisma.creditLedger.findMany({
      where: {
        type: "CONSUME",
        createdAt: { gte: startDate },
      },
      select: {
        amount: true,
        createdAt: true,
      },
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

    return Array.from(dailyMap.entries()).map(
      ([date, amount]) => ({ date, amount }),
    );
  },
);
