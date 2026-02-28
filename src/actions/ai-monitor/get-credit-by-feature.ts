"use server";

import { z } from "zod";
import { createAction } from "@/lib/action";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

export interface CreditByFeatureItem {
  feature: string;
  amount: number;
}

const schema = z.object({
  regionId: z.string(),
});

export const getCreditByFeature = createAction(
  { module: "get-credit-by-feature" },
  async (_session, input: z.input<typeof schema>): Promise<CreditByFeatureItem[]> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    // CreditLedger 모델이 제거되어 빈 데이터를 반환합니다.
    // 건수 기반 시스템으로 마이그레이션되었습니다.
    return [];
  },
);
