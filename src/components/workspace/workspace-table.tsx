import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { WorkspaceListItem } from "@/actions/workspace/get-workspaces";

interface WorkspaceTableProps {
  workspaces: WorkspaceListItem[];
  regionId: string;
}

const PLAN_BADGE: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  PRO: "bg-blue-100 text-blue-700",
};

export function WorkspaceTable({ workspaces, regionId }: WorkspaceTableProps) {
  if (workspaces.length === 0) {
    return <p className="text-sm text-muted-foreground">워크스페이스가 없습니다.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>플랜</TableHead>
            <TableHead className="text-right">크레딧</TableHead>
            <TableHead className="text-right">멤버</TableHead>
            <TableHead className="text-right">문서</TableHead>
            <TableHead className="text-right">ESG 완료</TableHead>
            <TableHead>생성일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workspaces.map((ws) => (
            <TableRow key={ws.id}>
              <TableCell>
                <Link href={`/${regionId}/workspaces/${ws.id}`} className="font-medium hover:underline">
                  {ws.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge className={PLAN_BADGE[ws.planCode] ?? PLAN_BADGE.FREE}>{ws.planCode}</Badge>
              </TableCell>
              <TableCell className="text-right">{ws.creditBalance.toLocaleString()}</TableCell>
              <TableCell className="text-right">{ws.memberCount}</TableCell>
              <TableCell className="text-right">{ws.documentCount}</TableCell>
              <TableCell className="text-right">{ws.esgCompletedCount}/69</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(ws.createdAt).toLocaleDateString("ko-KR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
