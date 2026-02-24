"use client";

import { useState, useCallback, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adjustCredit } from "@/actions/workspace/adjust-credit";

interface CreditAdjustFormProps {
  regionId: string;
  workspaceId: string;
  currentBalance: number;
}

export function CreditAdjustForm({ regionId, workspaceId, currentBalance }: CreditAdjustFormProps) {
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
        const result = await adjustCredit({ regionId, workspaceId, amount: numAmount, reason });
        if (!result.success) { setError(result.error); return; }
        setSuccess(`크레딧 조정 완료. 새 잔액: ${result.data.newBalance}`);
        setAmount("");
        setReason("");
      });
    },
    [regionId, workspaceId, amount, reason],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-muted-foreground">
        현재 잔액: <span className="font-semibold text-foreground">{currentBalance}</span>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}
      <div className="space-y-2">
        <Label htmlFor="amount">금액 (양수=지급, 음수=차감)</Label>
        <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="예: 100 또는 -50" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reason">사유</Label>
        <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="크레딧 조정 사유를 입력하세요" rows={2} />
      </div>
      <Button type="submit" disabled={isPending || !amount || !reason}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        크레딧 조정
      </Button>
    </form>
  );
}
