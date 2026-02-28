"use server";

import { createAction } from "@/lib/action";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

export interface CreditByWorkspaceItem {
  workspaceId: string;
  workspaceName: string;
  totalAmount: number;
}

export const getCreditByWorkspace = createAction(
  { module: "get-credit-by-workspace" },
  async (_session, regionId: string, _limit: number = 10): Promise<CreditByWorkspaceItem[]> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    // CreditLedger 모델이 제거되어 빈 데이터를 반환합니다.
    // 건수 기반 시스템으로 마이그레이션되었습니다.
    return [];
  },
);
