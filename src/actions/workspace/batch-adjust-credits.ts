"use server";

import { createAction } from "@/lib/action";
import { ValidationError } from "@/lib/errors";

export const batchAdjustCredits = createAction(
  { module: "batch-adjust-credits" },
  async (_session, _input: Record<string, unknown>): Promise<{ adjustedCount: number }> => {
    throw new ValidationError("크레딧 시스템이 건수 기반으로 변경되었습니다.");
  },
);
