import Link from "next/link";
import { FileText, Building2, ClipboardList, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/common/status-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatNumber } from "@/lib/format";
import { PLAN_BADGE, PLAN_LABEL } from "@/lib/constants";
import { getActivityStatus } from "@/lib/activity";
import type { UserDetail } from "@/actions/user/get-user-detail";

interface UserDetailViewProps {
  user: UserDetail;
  regionId: string;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

export function UserDetailView({ user, regionId }: UserDetailViewProps) {
  const status = getActivityStatus(user.updatedAt);

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              {user.image && <AvatarImage src={user.image} alt={user.name ?? "사용자"} />}
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle>{user.name ?? "이름 없음"}</CardTitle>
                <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
                {user.emailVerified && (
                  <StatusBadge variant="success">
                    <CheckCircle className="mr-0.5 h-3 w-3" />
                    인증됨
                  </StatusBadge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{user.email ?? "이메일 없음"}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">가입일</p>
              <p className="font-medium">{new Date(user.createdAt).toLocaleDateString("ko-KR")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">마지막 활동</p>
              <p className="font-medium">{new Date(user.updatedAt).toLocaleDateString("ko-KR")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">활성 워크스페이스</p>
              {user.activeWorkspaceName ? (
                <p className="font-medium">{user.activeWorkspaceName}</p>
              ) : (
                <p className="text-muted-foreground">없음</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">이메일 인증</p>
              <p className="font-medium">
                {user.emailVerified
                  ? new Date(user.emailVerified).toLocaleDateString("ko-KR")
                  : "미인증"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="업로드한 문서"
          value={formatNumber(user.activity.documentsUploaded)}
          icon={FileText}
        />
        <StatCard
          title="소유 워크스페이스"
          value={formatNumber(user.activity.workspacesOwned)}
          icon={Building2}
        />
        <StatCard
          title="생성한 보고서"
          value={formatNumber(user.activity.reportsCreated)}
          icon={ClipboardList}
        />
      </div>

      {/* Workspace Memberships */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">소속 워크스페이스 ({user.workspaces.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {user.workspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">소속된 워크스페이스가 없습니다.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>워크스페이스</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>플랜</TableHead>
                    <TableHead className="text-right">크레딧</TableHead>
                    <TableHead>가입일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.workspaces.map((ws) => (
                    <TableRow key={ws.id}>
                      <TableCell className="font-medium">
                        <Link href={`/${regionId}/workspaces/${ws.id}`} className="hover:underline">
                          {ws.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ws.role === "OWNER" ? "default" : "secondary"}>
                          {ws.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={PLAN_BADGE[ws.planCode] ?? PLAN_BADGE.FREE}>
                          {PLAN_LABEL[ws.planCode] ?? ws.planCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{ws.creditBalance.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(ws.joinedAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
