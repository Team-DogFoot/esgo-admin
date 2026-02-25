import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatFileSize } from "@/lib/format";
import type { WorkspaceDocumentItem } from "@/actions/workspace/get-workspace-documents";

interface WorkspaceDocumentsTabProps {
  documents: WorkspaceDocumentItem[];
}

const DOC_STATUS_MAP: Record<string, { variant: "success" | "warning" | "error" | "info" | "default" | "muted"; label: string }> = {
  UPLOADED: { variant: "default", label: "업로드" },
  PREPROCESSED: { variant: "info", label: "전처리" },
  CLASSIFIED: { variant: "info", label: "분류됨" },
  ANALYZING: { variant: "warning", label: "분석중" },
  ANALYZED: { variant: "success", label: "분석완료" },
};

const PHASE_MAP: Record<string, { variant: "success" | "warning" | "error" | "info" | "default" | "muted"; label: string }> = {
  PREPROCESSED: { variant: "info", label: "전처리" },
  CLASSIFIED: { variant: "info", label: "분류" },
  EXTRACTED: { variant: "success", label: "추출" },
};

export function WorkspaceDocumentsTab({ documents }: WorkspaceDocumentsTabProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">문서가 없습니다.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>파일명</TableHead>
            <TableHead>업로더</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">크기</TableHead>
            <TableHead className="text-right">ESG 항목</TableHead>
            <TableHead>파이프라인</TableHead>
            <TableHead>업로드일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const statusInfo = DOC_STATUS_MAP[doc.status] ?? { variant: "muted" as const, label: doc.status };
            const phaseInfo = doc.pipelinePhase ? (PHASE_MAP[doc.pipelinePhase] ?? { variant: "muted" as const, label: doc.pipelinePhase }) : null;
            return (
              <TableRow key={doc.id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {doc.displayName ?? doc.fileName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {doc.uploaderName ?? "-"}
                </TableCell>
                <TableCell>
                  <StatusBadge variant={statusInfo.variant}>{statusInfo.label}</StatusBadge>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatFileSize(doc.size)}
                </TableCell>
                <TableCell className="text-right">
                  {doc.linkedItemCount > 0 ? doc.linkedItemCount : "-"}
                </TableCell>
                <TableCell>
                  {phaseInfo ? (
                    <StatusBadge variant={phaseInfo.variant}>{phaseInfo.label}</StatusBadge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleDateString("ko-KR")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
