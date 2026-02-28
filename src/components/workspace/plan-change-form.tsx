"use client";

import { useState, useCallback, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PLAN_LABEL } from "@/lib/constants";
import { changePlan } from "@/actions/workspace/change-plan";

interface PlanChangeFormProps {
  regionId: string;
  workspaceId: string;
  currentPlanCode: string;
}

export function PlanChangeForm({ regionId, workspaceId, currentPlanCode }: PlanChangeFormProps) {
  const [planCode, setPlanCode] = useState(currentPlanCode);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (planCode === currentPlanCode) { toast.error("현재 플랜과 동일합니다."); return; }

      startTransition(async () => {
        const result = await changePlan({ regionId, workspaceId, planCode });
        if (!result.success) { toast.error(result.error); return; }
        toast.success(`플랜이 ${result.data.planCode}로 변경되었습니다.`);
      });
    },
    [regionId, workspaceId, planCode, currentPlanCode],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>플랜</Label>
        <Select value={planCode} onValueChange={setPlanCode}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PLAN_LABEL).map(([code, label]) => (
              <SelectItem key={code} value={code}>{label}</SelectItem>
            ))}
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
