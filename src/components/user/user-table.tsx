import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { getActivityStatus } from "@/lib/activity";
import type { UserListItem } from "@/actions/user/get-users";

interface UserTableProps {
  users: UserListItem[];
  regionId: string;
}

export function UserTable({ users, regionId }: UserTableProps) {
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">사용자가 없습니다.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>이메일</TableHead>
            <TableHead>소속 워크스페이스</TableHead>
            <TableHead>가입일</TableHead>
            <TableHead>활동 상태</TableHead>
            <TableHead>마지막 활동</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const status = getActivityStatus(user.updatedAt);
            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <Link href={`/${regionId}/users/${user.id}`} className="hover:underline">
                    {user.name ?? "-"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.workspaces.map((ws) => (
                      <Badge key={ws.name} variant="outline" className="text-xs">
                        {ws.name} ({ws.role})
                      </Badge>
                    ))}
                    {user.workspaces.length === 0 && (
                      <span className="text-xs text-muted-foreground">없음</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                </TableCell>
                <TableCell>
                  <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(user.updatedAt).toLocaleDateString("ko-KR")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
