"use server";

import { z } from "zod";
import { createAction } from "@/lib/action";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

const schema = z.object({
  regionId: z.string(),
  page: z.number().int().min(1).optional().default(1),
  perPage: z.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  typeFilter: z.string().optional(),
  dateRange: z
    .enum(["this_month", "last_month", "3_months", "all"])
    .optional()
    .default("all"),
});

export interface CreditLedgerItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  amount: number;
  balance: number;
  type: string;
  reason: string;
  referenceId: string | null;
  createdAt: Date;
}

export interface PaginatedCreditLedger {
  items: CreditLedgerItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export const getCreditLedger = createAction(
  { module: "get-credit-ledger" },
  async (_session, input: Record<string, unknown>): Promise<PaginatedCreditLedger> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, page, perPage } = parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    // CreditLedger 모델이 제거되어 빈 데이터를 반환합니다.
    // 건수 기반 시스템으로 마이그레이션되었습니다.
    return {
      items: [],
      total: 0,
      page,
      perPage,
      totalPages: 0,
    };
  },
);
