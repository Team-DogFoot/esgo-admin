import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatRelativeTime } from "@/lib/format";
import type { PipelineErrorItem } from "@/actions/ai-monitor/get-pipeline-errors";

interface PipelineErrorListProps {
  errors: PipelineErrorItem[];
}

const PHASE_VARIANT: Record<string, "info" | "warning" | "success"> = {
  PREPROCESSED: "info",
  CLASSIFIED: "warning",
  EXTRACTED: "success",
};

const PHASE_LABEL: Record<string, string> = {
  PREPROCESSED: "전처리",
  CLASSIFIED: "분류",
  EXTRACTED: "추출",
};

export function PipelineErrorList({ errors }: PipelineErrorListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">최근 파이프라인 에러</CardTitle>
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">에러가 없습니다.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>워크스페이스</TableHead>
                  <TableHead>문서</TableHead>
                  <TableHead>단계</TableHead>
                  <TableHead className="text-right">에러 수</TableHead>
                  <TableHead>마지막 에러</TableHead>
                  <TableHead>시작</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm font-medium">
                      {e.workspaceName}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm">
                      {e.documentName}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={PHASE_VARIANT[e.currentPhase] ?? "default"}>
                        {PHASE_LABEL[e.currentPhase] ?? e.currentPhase}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-red-100 text-red-700">{e.errorCount}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {e.lastError ? e.lastError.slice(0, 100) : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(e.startedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
