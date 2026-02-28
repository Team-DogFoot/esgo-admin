"use client";

import { useState, useCallback, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { batchAdjustQuota } from "@/actions/workspace/batch-adjust-quota";

interface BatchQuotaDialogProps {
  regionId: string;
  workspaceIds: string[];
  onComplete: () => void;
}

export function BatchQuotaDialog({ regionId, workspaceIds, onComplete }: BatchQuotaDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bonusAnalysis, setBonusAnalysis] = useState("0");
  const [bonusReport, setBonusReport] = useState("0");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!reason.trim()) { toast.error("사유를 입력하세요."); return; }

      startTransition(async () => {
        const result = await batchAdjustQuota({
          regionId,
          workspaceIds,
          bonusAnalysis: parseInt(bonusAnalysis, 10) || 0,
          bonusReport: parseInt(bonusReport, 10) || 0,
          reason,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`${result.data.adjustedCount}개 워크스페이스에 보너스가 지급되었습니다.`);
        setBonusAnalysis("0");
        setBonusReport("0");
        setReason("");
        setIsOpen(false);
        onComplete();
      });
    },
    [regionId, workspaceIds, bonusAnalysis, bonusReport, reason, onComplete],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setBonusAnalysis("0");
      setBonusReport("0");
      setReason("");
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          보너스 일괄 지급 ({workspaceIds.length}개 선택)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>보너스 일괄 지급</DialogTitle>
          <DialogDescription>
            선택한 {workspaceIds.length}개 워크스페이스에 보너스 건수를 일괄 지급합니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch-bonus-analysis">분석 보너스</Label>
              <Input
                id="batch-bonus-analysis"
                type="number"
                value={bonusAnalysis}
                onChange={(e) => setBonusAnalysis(e.target.value)}
                placeholder="예: 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-bonus-report">리포트 보너스</Label>
              <Input
                id="batch-bonus-report"
                type="number"
                value={bonusReport}
                onChange={(e) => setBonusReport(e.target.value)}
                placeholder="예: 5"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-quota-reason">사유</Label>
            <Textarea
              id="batch-quota-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="보너스 일괄 지급 사유를 입력하세요"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !reason.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              일괄 지급
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
