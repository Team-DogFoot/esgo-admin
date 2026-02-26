import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCostUsd, formatDuration, formatRelativeTime, formatTokens } from "@/lib/format";
import type { UsageLogItem } from "@/actions/ai-monitor/get-usage-logs";

interface UsageLogTableProps {
  logs: UsageLogItem[];
}

const PROVIDER_LABELS: Record<string, string> = {
  GEMINI: "Gemini",
  DOCUMENT_AI: "Document AI",
  CLOUD_VISION: "Cloud Vision",
};

const OPERATION_LABELS: Record<string, string> = {
  classify_P: "분류 (P)",
  classify_E: "분류 (E)",
  classify_S: "분류 (S)",
  classify_G: "분류 (G)",
  cache_create: "캐시 생성",
  preprocess_ocr: "OCR 전처리",
  preprocess_vision: "이미지 OCR",
  report_narrative_P: "보고서 (P)",
  report_narrative_E: "보고서 (E)",
  report_narrative_S: "보고서 (S)",
  report_narrative_G: "보고서 (G)",
};

function getOperationLabel(operation: string): string {
  const label = OPERATION_LABELS[operation];
  if (label) return label;
  if (operation.startsWith("extract_")) {
    const code = operation.slice("extract_".length);
    return `추출 (${code})`;
  }
  return operation;
}

export function UsageLogTable({ logs }: UsageLogTableProps) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        사용량 로그가 없습니다.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>시간</TableHead>
            <TableHead>워크스페이스</TableHead>
            <TableHead>서비스</TableHead>
            <TableHead>작업</TableHead>
            <TableHead className="text-right">토큰/페이지</TableHead>
            <TableHead className="text-right">비용</TableHead>
            <TableHead className="text-right">소요</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelativeTime(log.createdAt)}
              </TableCell>
              <TableCell className="font-medium">
                {log.workspaceName}
              </TableCell>
              <TableCell className="text-sm">
                {PROVIDER_LABELS[log.provider] ?? log.provider}
              </TableCell>
              <TableCell className="text-sm">
                {getOperationLabel(log.operation)}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {log.totalTokens != null
                  ? formatTokens(log.totalTokens)
                  : log.pageCount != null
                    ? `${log.pageCount}p`
                    : log.imageCount != null
                      ? `${log.imageCount}img`
                      : "-"}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {log.estimatedCostUsd != null
                  ? formatCostUsd(log.estimatedCostUsd)
                  : "-"}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {log.durationMs != null ? formatDuration(log.durationMs) : "-"}
              </TableCell>
              <TableCell>
                <Badge variant={log.success ? "secondary" : "destructive"}>
                  {log.success ? "성공" : "실패"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
