import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLAN_BADGE, PLAN_LABEL } from "@/lib/constants";
import type { EsgOverviewItem } from "@/actions/content/get-esg-overview";

interface EsgOverviewTableProps {
  items: EsgOverviewItem[];
  regionId: string;
}

export function EsgOverviewTable({ items, regionId }: EsgOverviewTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">ESG 데이터가 없습니다.</p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>워크스페이스</TableHead>
            <TableHead>플랜</TableHead>
            <TableHead className="text-right">전체</TableHead>
            <TableHead className="text-right">완료</TableHead>
            <TableHead className="text-right">진행중</TableHead>
            <TableHead className="text-right">미시작</TableHead>
            <TableHead>완료율</TableHead>
            <TableHead className="text-right">AI 비율</TableHead>
            <TableHead>최근 수정</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.workspaceId}>
              <TableCell>
                <Link
                  href={`/${regionId}/workspaces/${item.workspaceId}`}
                  className="font-medium hover:underline"
                >
                  {item.workspaceName}
                </Link>
              </TableCell>
              <TableCell>
                <Badge className={PLAN_BADGE[item.planCode] ?? PLAN_BADGE.FREE}>
                  {PLAN_LABEL[item.planCode] ?? item.planCode}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{item.totalItems}</TableCell>
              <TableCell className="text-right text-green-600">
                {item.completed}
              </TableCell>
              <TableCell className="text-right text-yellow-600">
                {item.inProgress}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {item.notStarted}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${item.completionRate}%` }}
                    />
                  </div>
                  <span className="text-sm">{item.completionRate}%</span>
                </div>
              </TableCell>
              <TableCell className="text-right text-sm">
                {item.aiRate}%
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {item.lastUpdated
                  ? new Date(item.lastUpdated).toLocaleDateString("ko-KR")
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
