import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/common/status-badge";
import type { WorkspaceEsgData } from "@/actions/workspace/get-workspace-esg";

interface WorkspaceEsgTabProps {
  data: WorkspaceEsgData;
}

const STATUS_MAP: Record<string, { variant: "success" | "warning" | "error" | "info" | "default" | "muted"; label: string }> = {
  NOT_STARTED: { variant: "muted", label: "미시작" },
  IN_PROGRESS: { variant: "warning", label: "진행중" },
  COMPLETED: { variant: "success", label: "완료" },
};

const SOURCE_MAP: Record<string, { variant: "success" | "warning" | "error" | "info" | "default" | "muted"; label: string }> = {
  AI: { variant: "info", label: "AI" },
  MANUAL: { variant: "default", label: "수동" },
};

const CATEGORY_LABELS: Record<string, string> = {
  E: "환경 (E)",
  S: "사회 (S)",
  G: "지배구조 (G)",
  전체: "전체",
};

export function WorkspaceEsgTab({ data }: WorkspaceEsgTabProps) {
  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ESG 진행 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{CATEGORY_LABELS[data.overall.category]}</span>
              <span className="text-muted-foreground">
                {data.overall.completed}/{data.overall.total} ({data.overall.rate}%)
              </span>
            </div>
            <Progress value={data.overall.rate} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {data.categories.map((cat) => (
              <div key={cat.category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{CATEGORY_LABELS[cat.category] ?? cat.category}</span>
                  <span className="text-muted-foreground">
                    {cat.completed}/{cat.total} ({cat.rate}%)
                  </span>
                </div>
                <Progress value={cat.rate} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Table */}
      {data.summaries.length === 0 ? (
        <p className="text-sm text-muted-foreground">ESG 데이터가 없습니다.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>항목 코드</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>소스</TableHead>
                <TableHead className="text-right">완료율</TableHead>
                <TableHead className="text-right">필드</TableHead>
                <TableHead>수정일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.summaries.map((s) => {
                const statusInfo = STATUS_MAP[s.status] ?? { variant: "muted" as const, label: s.status };
                const sourceInfo = s.source ? (SOURCE_MAP[s.source] ?? { variant: "muted" as const, label: s.source }) : null;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium font-mono text-sm">{s.esgItemCode}</TableCell>
                    <TableCell>
                      <StatusBadge variant={statusInfo.variant}>{statusInfo.label}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      {sourceInfo ? (
                        <StatusBadge variant={sourceInfo.variant}>{sourceInfo.label}</StatusBadge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{s.completionRate}%</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {s.filledFields}/{s.totalFields}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.updatedAt).toLocaleDateString("ko-KR")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
