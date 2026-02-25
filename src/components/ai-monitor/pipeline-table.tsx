import Link from "next/link";
import { Zap } from "lucide-react";
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
import { formatDuration, formatRelativeTime } from "@/lib/format";
import type { PipelineListItem } from "@/actions/ai-monitor/get-pipelines";

interface PipelineTableProps {
  pipelines: PipelineListItem[];
  regionId: string;
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

export function PipelineTable({ pipelines, regionId }: PipelineTableProps) {
  if (pipelines.length === 0) {
    return <p className="text-sm text-muted-foreground">파이프라인 세션이 없습니다.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>세션 ID</TableHead>
            <TableHead>워크스페이스</TableHead>
            <TableHead>문서</TableHead>
            <TableHead>단계</TableHead>
            <TableHead>자동</TableHead>
            <TableHead className="text-right">에러</TableHead>
            <TableHead className="text-right">소요 시간</TableHead>
            <TableHead>시작</TableHead>
            <TableHead>완료</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pipelines.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs">
                {p.sessionId.slice(0, 8)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/${regionId}/workspaces/${p.workspaceId}`}
                  className="font-medium hover:underline"
                >
                  {p.workspaceName}
                </Link>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm">
                {p.documentName}
              </TableCell>
              <TableCell>
                <StatusBadge variant={PHASE_VARIANT[p.currentPhase] ?? "default"}>
                  {PHASE_LABEL[p.currentPhase] ?? p.currentPhase}
                </StatusBadge>
              </TableCell>
              <TableCell>
                {p.autoMode && (
                  <Zap className="h-4 w-4 text-yellow-500" />
                )}
              </TableCell>
              <TableCell className="text-right">
                {p.errorCount > 0 ? (
                  <Badge className="bg-red-100 text-red-700">{p.errorCount}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {p.durationMs != null ? formatDuration(p.durationMs) : "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelativeTime(p.startedAt)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {p.completedAt
                  ? formatRelativeTime(p.completedAt)
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
