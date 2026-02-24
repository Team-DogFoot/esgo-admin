"use client";

import { useState, useCallback, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { changePlan } from "@/actions/workspace/change-plan";

interface PlanChangeFormProps {
  regionId: string;
  workspaceId: string;
  currentPlanCode: string;
}

export function PlanChangeForm({ regionId, workspaceId, currentPlanCode }: PlanChangeFormProps) {
  const [planCode, setPlanCode] = useState(currentPlanCode);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      if (planCode === currentPlanCode) { setError("현재 플랜과 동일합니다."); return; }

      startTransition(async () => {
        const result = await changePlan({ regionId, workspaceId, planCode: planCode as "FREE" | "PRO" });
        if (!result.success) { setError(result.error); return; }
        setSuccess(`플랜이 ${result.data.planCode}로 변경되었습니다.`);
      });
    },
    [regionId, workspaceId, planCode, currentPlanCode],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}
      <div className="space-y-2">
        <Label>플랜</Label>
        <Select value={planCode} onValueChange={setPlanCode}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="FREE">FREE</SelectItem>
            <SelectItem value="PRO">PRO</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending || planCode === currentPlanCode}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        플랜 변경
      </Button>
    </form>
  );
}
