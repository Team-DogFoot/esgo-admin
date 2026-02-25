"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-credit-ledger" });

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

function getDateRangeFilter(
  dateRange: string,
): { gte: Date } | undefined {
  const now = new Date();
  switch (dateRange) {
    case "this_month":
      return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    case "last_month":
      return { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1) };
    case "3_months":
      return { gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) };
    default:
      return undefined;
  }
}

export async function getCreditLedger(
  input: z.input<typeof schema>,
): Promise<ActionResult<PaginatedCreditLedger>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId, page, perPage, search, typeFilter, dateRange } =
    parsed.data;
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, page, perPage }, "getCreditLedger started");

  try {
    const dateFilter = getDateRangeFilter(dateRange);

    const where = {
      ...(search && {
        workspace: {
          name: { contains: search, mode: "insensitive" as const },
        },
      }),
      ...(typeFilter && {
        type: typeFilter as
          | "INITIAL"
          | "MONTHLY"
          | "PURCHASE"
          | "CONSUME"
          | "REFUND"
          | "ADMIN",
      }),
      ...(dateFilter && { createdAt: dateFilter }),
    };

    const [total, ledgers] = await Promise.all([
      prisma.creditLedger.count({ where }),
      prisma.creditLedger.findMany({
        where,
        include: {
          workspace: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const items: CreditLedgerItem[] = ledgers.map((l) => ({
      id: l.id,
      workspaceId: l.workspaceId,
      workspaceName: l.workspace.name,
      amount: l.amount,
      balance: l.balance,
      type: l.type,
      reason: l.reason,
      referenceId: l.referenceId,
      createdAt: l.createdAt,
    }));

    const result: PaginatedCreditLedger = {
      items,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };

    log.info({ regionId, total, page }, "getCreditLedger succeeded");
    return ok(result);
  } catch (error) {
    log.error({ err: error, regionId }, "getCreditLedger failed");
    return fail("크레딧 내역 조회에 실패했습니다.");
  }
}
