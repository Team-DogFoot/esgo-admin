import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Coins, ClipboardCheck } from "lucide-react";
import { CreditAdjustForm } from "@/components/workspace/credit-adjust-form";
import { PlanChangeForm } from "@/components/workspace/plan-change-form";
import { MemberList } from "@/components/workspace/member-list";
import type { WorkspaceDetail as WorkspaceDetailType } from "@/actions/workspace/get-workspace-detail";

interface WorkspaceDetailProps {
  workspace: WorkspaceDetailType;
  regionId: string;
}

const PLAN_BADGE: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  PRO: "bg-blue-100 text-blue-700",
};

export function WorkspaceDetail({ workspace, regionId }: WorkspaceDetailProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>{workspace.name}</CardTitle>
              <p className="text-sm text-muted-foreground">사업자번호: {workspace.businessNumber}</p>
            </div>
            <Badge className={PLAN_BADGE[workspace.planCode] ?? PLAN_BADGE.FREE}>{workspace.planCode}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{workspace.creditBalance}</p>
              <p className="text-xs text-muted-foreground">크레딧 잔액</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{workspace.members.length}</p>
              <p className="text-xs text-muted-foreground">멤버</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{workspace.esgProgress.completed}/{workspace.esgProgress.total}</p>
              <p className="text-xs text-muted-foreground">ESG 완료</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">크레딧 조정</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CreditAdjustForm regionId={regionId} workspaceId={workspace.id} currentBalance={workspace.creditBalance} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">구독 변경</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <PlanChangeForm regionId={regionId} workspaceId={workspace.id} currentPlanCode={workspace.planCode} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">멤버 ({workspace.members.length})</CardTitle></CardHeader>
        <CardContent><MemberList members={workspace.members} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">최근 크레딧 이력</CardTitle></CardHeader>
        <CardContent>
          {workspace.recentCredits.length === 0 ? (
            <p className="text-sm text-muted-foreground">크레딧 이력이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {workspace.recentCredits.map((cl) => (
                <div key={cl.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{cl.type}</Badge>
                    <span className="text-muted-foreground">{cl.reason ?? "-"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cl.amount >= 0 ? "text-green-600" : "text-red-600"}>
                      {cl.amount >= 0 ? "+" : ""}{cl.amount}
                    </span>
                    <span className="text-muted-foreground">잔액 {cl.balance}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(cl.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
