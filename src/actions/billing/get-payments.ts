"use server";

import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient, PaymentStatus } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { getDateRangeFilter } from "@/lib/date-range";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-payments" });

const schema = z.object({
  regionId: z.string(),
  page: z.number().int().min(1).optional().default(1),
  perPage: z.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  statusFilter: z.nativeEnum(PaymentStatus).optional(),
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

export async function getPayments(
  input: Record<string, unknown>,
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
      ...(statusFilter && { status: statusFilter }),
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
