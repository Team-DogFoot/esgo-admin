"use server";

import { z } from "zod";
import { createAction } from "@/lib/action";
import { getPrismaClient, PaymentStatus } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { getDateRangeFilter } from "@/lib/date-range";
import { ValidationError } from "@/lib/errors";

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

export const getPayments = createAction(
  { module: "get-payments" },
  async (_session, input: Record<string, unknown>): Promise<PaginatedPayments> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ValidationError("잘못된 요청입니다.");

    const { regionId, page, perPage, search, statusFilter, dateRange } =
      parsed.data;
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

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

    return {
      items,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  },
);
