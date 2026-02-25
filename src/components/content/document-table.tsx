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
import { formatFileSize } from "@/lib/format";
import type { DocumentListItem } from "@/actions/content/get-documents";

interface DocumentTableProps {
  documents: DocumentListItem[];
  regionId: string;
}

const DOCUMENT_STATUS_MAP: Record<
  string,
  { label: string; variant: "success" | "warning" | "error" | "info" | "default" | "muted" }
> = {
  UPLOADED: { label: "업로드", variant: "default" },
  PREPROCESSED: { label: "전처리 완료", variant: "info" },
  CLASSIFIED: { label: "분류 완료", variant: "info" },
  ANALYZING: { label: "분석 중", variant: "warning" },
  ANALYZED: { label: "분석 완료", variant: "success" },
};

const PIPELINE_PHASE_MAP: Record<
  string,
  { label: string; variant: "success" | "warning" | "error" | "info" | "default" | "muted" }
> = {
  PREPROCESSED: { label: "전처리", variant: "muted" },
  CLASSIFIED: { label: "분류", variant: "info" },
  EXTRACTED: { label: "추출", variant: "success" },
};

export function DocumentTable({ documents, regionId }: DocumentTableProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">문서가 없습니다.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>파일명</TableHead>
            <TableHead>워크스페이스</TableHead>
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
            const statusInfo = DOCUMENT_STATUS_MAP[doc.status] ?? {
              label: doc.status,
              variant: "default" as const,
            };
            const pipelineInfo = doc.pipelinePhase
              ? PIPELINE_PHASE_MAP[doc.pipelinePhase]
              : null;

            return (
              <TableRow key={doc.id}>
                <TableCell className="max-w-48 truncate font-medium">
                  {doc.displayName ?? doc.fileName}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/${regionId}/workspaces/${doc.workspaceId}`}
                    className="hover:underline"
                  >
                    {doc.workspaceName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {doc.uploaderName ?? "-"}
                </TableCell>
                <TableCell>
                  <StatusBadge variant={statusInfo.variant}>
                    {statusInfo.label}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatFileSize(BigInt(doc.size))}
                </TableCell>
                <TableCell className="text-right">
                  {doc.linkedItemCount}
                </TableCell>
                <TableCell>
                  {pipelineInfo ? (
                    <StatusBadge variant={pipelineInfo.variant}>
                      {pipelineInfo.label}
                    </StatusBadge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
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
