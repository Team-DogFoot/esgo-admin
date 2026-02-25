import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatCurrency } from "@/lib/format";
import type { PaymentListItem } from "@/actions/billing/get-payments";

interface PaymentTableProps {
  payments: PaymentListItem[];
  regionId: string;
}

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "error" | "info" | "default" | "muted"
> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "error",
  REFUNDED: "info",
  CANCELED: "muted",
};

const STATUS_LABEL: Record<string, string> = {
  PAID: "결제 완료",
  PENDING: "대기",
  FAILED: "실패",
  REFUNDED: "환불",
  CANCELED: "취소",
};

const TYPE_LABEL: Record<string, string> = {
  SUBSCRIPTION: "구독",
  CREDIT_PURCHASE: "크레딧 구매",
};

export function PaymentTable({ payments, regionId }: PaymentTableProps) {
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>워크스페이스</TableHead>
            <TableHead>유형</TableHead>
            <TableHead className="text-right">금액</TableHead>
            <TableHead className="text-right">크레딧</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>영수증</TableHead>
            <TableHead>실패 사유</TableHead>
            <TableHead>결제일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                <Link
                  href={`/${regionId}/workspaces/${payment.workspaceId}`}
                  className="font-medium hover:underline"
                >
                  {payment.workspaceName}
                </Link>
              </TableCell>
              <TableCell className="text-sm">
                {TYPE_LABEL[payment.type] ?? payment.type}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(payment.amount)}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {payment.credits != null
                  ? payment.credits.toLocaleString()
                  : "-"}
              </TableCell>
              <TableCell>
                <StatusBadge
                  variant={STATUS_VARIANT[payment.status] ?? "default"}
                >
                  {STATUS_LABEL[payment.status] ?? payment.status}
                </StatusBadge>
              </TableCell>
              <TableCell>
                {payment.receiptUrl ? (
                  <a
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    영수증
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {payment.failReason ? (
                  <span className="text-sm text-red-700">
                    {payment.failReason}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {payment.paidAt
                  ? new Date(payment.paidAt).toLocaleDateString("ko-KR")
                  : new Date(payment.createdAt).toLocaleDateString("ko-KR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
