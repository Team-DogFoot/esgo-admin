import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import type { SubscriptionListItem } from "@/actions/billing/get-subscriptions";

interface SubscriptionTableProps {
  subscriptions: SubscriptionListItem[];
  regionId: string;
}

const PLAN_BADGE: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  PRO: "bg-blue-100 text-blue-700",
};

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "error" | "info" | "default" | "muted"
> = {
  ACTIVE: "success",
  CANCELED: "muted",
  PAST_DUE: "warning",
  EXPIRED: "error",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "활성",
  CANCELED: "해지",
  PAST_DUE: "연체",
  EXPIRED: "만료",
};

function isExpiringSoon(endDate: Date): boolean {
  const now = new Date();
  const diff = new Date(endDate).getTime() - now.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return diff > 0 && diff <= sevenDays;
}

export function SubscriptionTable({
  subscriptions,
  regionId,
}: SubscriptionTableProps) {
  if (subscriptions.length === 0) {
    return <p className="text-sm text-muted-foreground">구독 내역이 없습니다.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>워크스페이스</TableHead>
            <TableHead>플랜</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">월 요금</TableHead>
            <TableHead>구독 시작</TableHead>
            <TableHead>구독 종료</TableHead>
            <TableHead>해지일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((sub) => {
            const isExpiring =
              sub.status === "ACTIVE" &&
              isExpiringSoon(sub.currentPeriodEnd);

            return (
              <TableRow key={sub.id}>
                <TableCell>
                  <Link
                    href={`/${regionId}/workspaces/${sub.workspaceId}`}
                    className="font-medium hover:underline"
                  >
                    {sub.workspaceName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      PLAN_BADGE[sub.planCode] ?? PLAN_BADGE.FREE
                    }
                  >
                    {sub.planCode}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    variant={STATUS_VARIANT[sub.status] ?? "default"}
                  >
                    {STATUS_LABEL[sub.status] ?? sub.status}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(sub.monthlyPrice)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(sub.currentPeriodStart).toLocaleDateString("ko-KR")}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      isExpiring
                        ? "flex items-center gap-1 text-sm font-medium text-yellow-700"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {isExpiring && (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    {new Date(sub.currentPeriodEnd).toLocaleDateString("ko-KR")}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {sub.canceledAt
                    ? new Date(sub.canceledAt).toLocaleDateString("ko-KR")
                    : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
