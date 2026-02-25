import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WorkspacePipelineItem } from "@/actions/workspace/get-workspace-pipelines";

interface WorkspacePipelinesTabProps {
  pipelines: WorkspacePipelineItem[];
}

const PHASE_MAP: Record<string, { variant: "success" | "warning" | "error" | "info" | "default" | "muted"; label: string }> = {
  PREPROCESSED: { variant: "info", label: "전처리" },
  CLASSIFIED: { variant: "info", label: "분류" },
  EXTRACTED: { variant: "success", label: "추출" },
};

export function WorkspacePipelinesTab({ pipelines }: WorkspacePipelinesTabProps) {
  if (pipelines.length === 0) {
    return <p className="text-sm text-muted-foreground">파이프라인 세션이 없습니다.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>파일명</TableHead>
            <TableHead>단계</TableHead>
            <TableHead>모드</TableHead>
            <TableHead className="text-right">에러</TableHead>
            <TableHead>소요 시간</TableHead>
            <TableHead>시작일</TableHead>
            <TableHead>완료일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pipelines.map((p) => {
            const phaseInfo = PHASE_MAP[p.currentPhase] ?? { variant: "muted" as const, label: p.currentPhase };
            const hasError = p.errorCount > 0;
            return (
              <TableRow
                key={p.id}
                className={cn(hasError && "bg-red-50")}
              >
                <TableCell className="font-medium max-w-[200px] truncate">
                  {p.fileName}
                </TableCell>
                <TableCell>
                  <StatusBadge variant={phaseInfo.variant}>{phaseInfo.label}</StatusBadge>
                </TableCell>
                <TableCell>
                  <Badge variant={p.autoMode ? "default" : "outline"} className="text-xs">
                    {p.autoMode ? "자동" : "수동"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {hasError ? (
                    <span className="font-medium text-red-600" title={p.lastError ?? undefined}>
                      {p.errorCount}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.durationMs != null ? formatDuration(p.durationMs) : "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(p.startedAt).toLocaleDateString("ko-KR")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.completedAt ? new Date(p.completedAt).toLocaleDateString("ko-KR") : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
