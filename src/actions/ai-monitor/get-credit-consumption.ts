"use server";

import { z } from "zod";
import { createAction } from "@/lib/action";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";
import type { DailyConsumption } from "@/types/credit";

const schema = z.object({
  regionId: z.string(),
  days: z.number().int().min(1).max(365).default(7),
});

export const getCreditConsumption = createAction(
  { module: "ai-monitor/get-credit-consumption" },
  async (_session, input: z.input<typeof schema>): Promise<DailyConsumption[]> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, days } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    // CreditLedger 모델이 제거되어 빈 데이터를 반환합니다.
    // 건수 기반 시스템으로 마이그레이션되었습니다.
    const dailyMap = new Map<string, number>();

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }

    return Array.from(dailyMap.entries()).map(
      ([date, amount]) => ({ date, amount }),
    );
  },
);
