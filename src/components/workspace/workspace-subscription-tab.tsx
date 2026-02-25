import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatCurrency } from "@/lib/format";
import { PLAN_BADGE } from "@/lib/constants";
import type { WorkspaceSubscriptionData } from "@/actions/workspace/get-workspace-subscription";

interface WorkspaceSubscriptionTabProps {
  data: WorkspaceSubscriptionData;
}

const SUBSCRIPTION_STATUS_MAP: Record<string, { variant: "success" | "warning" | "error" | "info" | "default" | "muted"; label: string }> = {
  ACTIVE: { variant: "success", label: "활성" },
  CANCELED: { variant: "muted", label: "해지" },
  PAST_DUE: { variant: "warning", label: "미납" },
  EXPIRED: { variant: "error", label: "만료" },
};

const PAYMENT_STATUS_MAP: Record<string, { variant: "success" | "warning" | "error" | "info" | "default" | "muted"; label: string }> = {
  PENDING: { variant: "warning", label: "대기" },
  PAID: { variant: "success", label: "완료" },
  FAILED: { variant: "error", label: "실패" },
  REFUNDED: { variant: "info", label: "환불" },
  CANCELED: { variant: "muted", label: "취소" },
};

const PAYMENT_TYPE_MAP: Record<string, string> = {
  SUBSCRIPTION: "구독",
  CREDIT_PURCHASE: "크레딧 구매",
};

export function WorkspaceSubscriptionTab({ data }: WorkspaceSubscriptionTabProps) {
  return (
    <div className="space-y-6">
      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">구독 정보</CardTitle>
        </CardHeader>
        <CardContent>
          {data.subscription ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">플랜</p>
                  <div className="mt-1">
                    <Badge className={PLAN_BADGE[data.subscription.plan.code] ?? PLAN_BADGE.FREE}>
                      {data.subscription.plan.name} ({data.subscription.plan.code})
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">상태</p>
                  <div className="mt-1">
                    <StatusBadge
                      variant={SUBSCRIPTION_STATUS_MAP[data.subscription.status]?.variant ?? "muted"}
                    >
                      {SUBSCRIPTION_STATUS_MAP[data.subscription.status]?.label ?? data.subscription.status}
                    </StatusBadge>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">구독 기간</p>
                  <p className="font-medium">
                    {new Date(data.subscription.currentPeriodStart).toLocaleDateString("ko-KR")}
                    {" ~ "}
                    {new Date(data.subscription.currentPeriodEnd).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">월 요금</p>
                  <p className="font-medium">{formatCurrency(data.subscription.plan.monthlyPrice)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">초기 크레딧</p>
                  <p className="font-medium">{data.subscription.plan.initialCredits}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">월 크레딧</p>
                  <p className="font-medium">{data.subscription.plan.monthlyCredits}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">최대 멤버</p>
                  <p className="font-medium">{data.subscription.plan.maxMembers ?? "무제한"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">최대 문서</p>
                  <p className="font-medium">{data.subscription.plan.maxDocuments ?? "무제한"}</p>
                </div>
              </div>
              {data.subscription.canceledAt && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                  해지일: {new Date(data.subscription.canceledAt).toLocaleDateString("ko-KR")}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">구독 정보가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">결제 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {data.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>유형</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead className="text-right">크레딧</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>결제일</TableHead>
                    <TableHead>생성일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payments.map((payment) => {
                    const statusInfo = PAYMENT_STATUS_MAP[payment.status] ?? { variant: "muted" as const, label: payment.status };
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {PAYMENT_TYPE_MAP[payment.type] ?? payment.type}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {payment.credits != null ? payment.credits : "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge variant={statusInfo.variant}>{statusInfo.label}</StatusBadge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.paidAt
                            ? new Date(payment.paidAt).toLocaleDateString("ko-KR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleDateString("ko-KR")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
