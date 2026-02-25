import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import type { CreditLedgerItem } from "@/actions/billing/get-credit-ledger";

interface CreditLedgerTableProps {
  items: CreditLedgerItem[];
  regionId: string;
}

const TYPE_VARIANT: Record<
  string,
  "success" | "warning" | "error" | "info" | "default" | "muted"
> = {
  INITIAL: "info",
  MONTHLY: "info",
  PURCHASE: "success",
  CONSUME: "warning",
  REFUND: "error",
  ADMIN: "muted",
};

const TYPE_LABEL: Record<string, string> = {
  INITIAL: "초기 지급",
  MONTHLY: "월간 지급",
  PURCHASE: "구매",
  CONSUME: "소비",
  REFUND: "환불",
  ADMIN: "어드민",
};

export function CreditLedgerTable({ items, regionId }: CreditLedgerTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">크레딧 내역이 없습니다.</p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>워크스페이스</TableHead>
            <TableHead>유형</TableHead>
            <TableHead className="text-right">변동량</TableHead>
            <TableHead className="text-right">잔액</TableHead>
            <TableHead>사유</TableHead>
            <TableHead>참조 ID</TableHead>
            <TableHead>일시</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link
                  href={`/${regionId}/workspaces/${item.workspaceId}`}
                  className="font-medium hover:underline"
                >
                  {item.workspaceName}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge variant={TYPE_VARIANT[item.type] ?? "default"}>
                  {TYPE_LABEL[item.type] ?? item.type}
                </StatusBadge>
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={
                    item.amount > 0
                      ? "font-medium text-green-700"
                      : item.amount < 0
                        ? "font-medium text-red-700"
                        : "text-muted-foreground"
                  }
                >
                  {item.amount > 0 ? "+" : ""}
                  {item.amount.toLocaleString()}
                </span>
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {item.balance.toLocaleString()}
              </TableCell>
              <TableCell className="max-w-48 truncate text-sm">
                {item.reason}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {item.referenceId ?? "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString("ko-KR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
