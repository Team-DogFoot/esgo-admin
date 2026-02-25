import { redirect } from "next/navigation";
import Link from "next/link";
import {
  DollarSign,
  CreditCard,
  Coins,
  AlertTriangle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { PlanDistribution } from "@/components/dashboard/plan-distribution";
import { StatusBadge } from "@/components/common/status-badge";
import { CreditConsumptionChart } from "@/components/billing/credit-consumption-chart";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getRegion } from "@/lib/regions";
import { getBillingStats } from "@/actions/billing/get-billing-stats";
import { getCreditConsumption } from "@/actions/billing/get-credit-consumption";

interface BillingPageProps {
  params: Promise<{ region: string }>;
}

const PAYMENT_STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "error" | "info" | "default" | "muted"
> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "error",
  REFUNDED: "info",
  CANCELED: "muted",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PAID: "결제 완료",
  PENDING: "대기",
  FAILED: "실패",
  REFUNDED: "환불",
  CANCELED: "취소",
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  SUBSCRIPTION: "구독",
  CREDIT_PURCHASE: "크레딧 구매",
};

export default async function BillingPage({ params }: BillingPageProps) {
  const { region: regionId } = await params;
  const region = getRegion(regionId);
  if (!region) redirect("/");

  const [statsResult, consumptionResult] = await Promise.all([
    getBillingStats(regionId),
    getCreditConsumption(regionId, 7),
  ]);

  if (!statsResult.success) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {statsResult.error}
        </div>
      </div>
    );
  }

  const stats = statsResult.data;
  const consumption = consumptionResult.success ? consumptionResult.data : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">빌링 대시보드</h1>
        <p className="text-sm text-muted-foreground">
          {region.flag} {region.name} — 구독, 결제, 크레딧 현황
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="월간 반복 수익 (MRR)"
          value={formatCurrency(stats.mrr)}
          icon={DollarSign}
        />
        <StatCard
          title="활성 구독"
          value={`${formatNumber(stats.activeSubscriptions)} / ${formatNumber(stats.totalWorkspaces)}`}
          icon={CreditCard}
          description={`전환율 ${stats.conversionRate}%`}
        />
        <StatCard
          title="이번 달 크레딧 소비"
          value={formatNumber(stats.monthlyCreditsConsumed)}
          icon={Coins}
        />
        <StatCard
          title="미결/실패 결제"
          value={formatNumber(stats.pendingOrFailedPayments)}
          icon={AlertTriangle}
          description={
            stats.pendingOrFailedPayments > 0 ? "확인이 필요합니다" : undefined
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlanDistribution data={stats.planDistribution} />
        <CreditConsumptionChart data={consumption} />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">최근 결제</CardTitle>
            <Link
              href={`/${regionId}/billing/payments`}
              className="text-sm text-blue-600 hover:underline"
            >
              전체 보기
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                결제 내역이 없습니다.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>워크스페이스</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>일시</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.workspaceName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {PAYMENT_TYPE_LABEL[payment.type] ?? payment.type}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={
                              PAYMENT_STATUS_VARIANT[payment.status] ??
                              "default"
                            }
                          >
                            {PAYMENT_STATUS_LABEL[payment.status] ??
                              payment.status}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.paidAt
                            ? new Date(payment.paidAt).toLocaleDateString(
                                "ko-KR",
                              )
                            : new Date(payment.createdAt).toLocaleDateString(
                                "ko-KR",
                              )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
