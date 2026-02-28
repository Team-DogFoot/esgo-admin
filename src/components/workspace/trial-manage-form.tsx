"use client";

import { useState, useCallback, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { manageTrial } from "@/actions/workspace/manage-trial";
import type { SubscriptionInfo } from "@/actions/workspace/get-workspace-subscription";

interface TrialManageFormProps {
  regionId: string;
  workspaceId: string;
  subscription: SubscriptionInfo | null;
}

function getTrialStatus(subscription: SubscriptionInfo | null): "none" | "active" | "expired" {
  if (!subscription?.trialEndsAt) return "none";
  if (subscription.trialEndedAt) return "expired";
  if (new Date(subscription.trialEndsAt) > new Date()) return "active";
  return "expired";
}

function getDaysRemaining(trialEndsAt: Date): number {
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function TrialManageForm({ regionId, workspaceId, subscription }: TrialManageFormProps) {
  const trialStatus = getTrialStatus(subscription);
  const [extendDate, setExtendDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAction = useCallback(
    (action: "start" | "extend" | "end") => {
      if (action === "extend" && !extendDate) {
        toast.error("연장할 날짜를 선택하세요.");
        return;
      }

      startTransition(async () => {
        const payload: Record<string, unknown> = { regionId, workspaceId, action };

        if (action === "extend") {
          payload.trialEndsAt = new Date(extendDate).toISOString();
        }

        const result = await manageTrial(payload);
        if (!result.success) { toast.error(result.error); return; }

        const messages: Record<string, string> = {
          start: "트라이얼이 시작되었습니다. (7일)",
          extend: "트라이얼이 연장되었습니다.",
          end: "트라이얼이 종료되었습니다.",
        };
        toast.success(messages[action]);
        setExtendDate("");
      });
    },
    [regionId, workspaceId, extendDate],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">트라이얼 관리</CardTitle>
          {trialStatus === "none" && <Badge variant="secondary">없음</Badge>}
          {trialStatus === "active" && <Badge className="bg-green-100 text-green-700">활성</Badge>}
          {trialStatus === "expired" && <Badge variant="destructive">만료</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {trialStatus === "active" && subscription?.trialEndsAt && (
          <div className="text-sm">
            <p className="text-muted-foreground">
              남은 일수: <span className="font-semibold text-foreground">{getDaysRemaining(subscription.trialEndsAt)}일</span>
            </p>
            <p className="text-muted-foreground">
              종료 예정: <span className="font-semibold text-foreground">{new Date(subscription.trialEndsAt).toLocaleDateString("ko-KR")}</span>
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          {(trialStatus === "none" || trialStatus === "expired") && (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => handleAction("start")}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {trialStatus === "expired" ? "트라이얼 재시작 (7일)" : "트라이얼 시작 (7일)"}
            </Button>
          )}

          {trialStatus === "active" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="extend-date" className="text-xs">연장 날짜</Label>
                <Input
                  id="extend-date"
                  type="date"
                  value={extendDate}
                  onChange={(e) => setExtendDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending || !extendDate}
                onClick={() => handleAction("extend")}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                연장
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() => handleAction("end")}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                종료
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
