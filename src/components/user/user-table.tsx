import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { UserListItem } from "@/actions/user/get-users";

interface UserTableProps {
  users: UserListItem[];
}

export function UserTable({ users }: UserTableProps) {
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
            <TableHead>마지막 활동</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name ?? "-"}</TableCell>
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
                {new Date(user.updatedAt).toLocaleDateString("ko-KR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
