"use server";

import { createAction } from "@/lib/action";
import { ValidationError } from "@/lib/errors";

export const adjustCredit = createAction(
  { module: "adjust-credit" },
  async (_session, _input: Record<string, unknown>): Promise<{ newBalance: number }> => {
    throw new ValidationError("크레딧 시스템이 건수 기반으로 변경되었습니다.");
  },
);
