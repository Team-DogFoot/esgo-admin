import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReportListItem } from "@/actions/content/get-reports";

interface ReportTableProps {
  reports: ReportListItem[];
  regionId: string;
}

export function ReportTable({ reports, regionId }: ReportTableProps) {
  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">보고서가 없습니다.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>제목</TableHead>
            <TableHead>워크스페이스</TableHead>
            <TableHead>작성자</TableHead>
            <TableHead>생성일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">{report.title}</TableCell>
              <TableCell>
                <Link
                  href={`/${regionId}/workspaces/${report.workspaceId}`}
                  className="hover:underline"
                >
                  {report.workspaceName}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {report.creatorName ?? "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(report.generatedAt).toLocaleDateString("ko-KR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
