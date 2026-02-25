"use client";

import { useState, useCallback, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { batchAdjustCredits } from "@/actions/workspace/batch-adjust-credits";

interface BatchCreditDialogProps {
  regionId: string;
  workspaceIds: string[];
  onComplete: () => void;
}

export function BatchCreditDialog({ regionId, workspaceIds, onComplete }: BatchCreditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      const numAmount = parseInt(amount, 10);
      if (isNaN(numAmount) || numAmount === 0) {
        setError("유효한 금액을 입력하세요.");
        return;
      }

      startTransition(async () => {
        const result = await batchAdjustCredits({
          regionId,
          workspaceIds,
          amount: numAmount,
          reason,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        setSuccess(`${result.data.adjustedCount}개 워크스페이스에 크레딧이 조정되었습니다.`);
        setAmount("");
        setReason("");
        onComplete();
      });
    },
    [regionId, workspaceIds, amount, reason, onComplete],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setAmount("");
      setReason("");
      setError(null);
      setSuccess(null);
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          크레딧 일괄 지급 ({workspaceIds.length}개 선택)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>크레딧 일괄 조정</DialogTitle>
          <DialogDescription>
            선택한 {workspaceIds.length}개 워크스페이스에 크레딧을 일괄 조정합니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="batch-amount">금액 (양수=지급, 음수=차감)</Label>
            <Input
              id="batch-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="예: 100 또는 -50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-reason">사유</Label>
            <Textarea
              id="batch-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="크레딧 일괄 조정 사유를 입력하세요"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !amount || !reason}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              일괄 조정
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
