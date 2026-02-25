"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-payments" });

const schema = z.object({
  regionId: z.string(),
  page: z.number().int().min(1).optional().default(1),
  perPage: z.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  statusFilter: z.string().optional(),
  dateRange: z
    .enum(["this_month", "last_month", "3_months", "all"])
    .optional()
    .default("all"),
});

export interface PaymentListItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  amount: number;
  credits: number | null;
  type: string;
  status: string;
  portonePaymentId: string | null;
  receiptUrl: string | null;
  failReason: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface PaginatedPayments {
  items: PaymentListItem[];
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

export async function getPayments(
  input: z.input<typeof schema>,
): Promise<ActionResult<PaginatedPayments>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("잘못된 요청입니다.");

  const { regionId, page, perPage, search, statusFilter, dateRange } =
    parsed.data;
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, page, perPage }, "getPayments started");

  try {
    const dateFilter = getDateRangeFilter(dateRange);

    const where = {
      ...(search && {
        Workspace: {
          name: { contains: search, mode: "insensitive" as const },
        },
      }),
      ...(statusFilter && {
        status: statusFilter as
          | "PENDING"
          | "PAID"
          | "FAILED"
          | "REFUNDED"
          | "CANCELED",
      }),
      ...(dateFilter && { createdAt: dateFilter }),
    };

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          Workspace: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const items: PaymentListItem[] = payments.map((p) => ({
      id: p.id,
      workspaceId: p.workspaceId,
      workspaceName: p.Workspace.name,
      amount: p.amount,
      credits: p.credits,
      type: p.type,
      status: p.status,
      portonePaymentId: p.portonePaymentId,
      receiptUrl: p.receiptUrl,
      failReason: p.failReason,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }));

    const result: PaginatedPayments = {
      items,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };

    log.info({ regionId, total, page }, "getPayments succeeded");
    return ok(result);
  } catch (error) {
    log.error({ err: error, regionId }, "getPayments failed");
    return fail("결제 목록 조회에 실패했습니다.");
  }
}
