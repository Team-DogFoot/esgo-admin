"use client";

import { useState, useCallback, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adjustQuota } from "@/actions/workspace/adjust-quota";

interface QuotaAdjustFormProps {
  regionId: string;
  workspaceId: string;
  current: {
    analysisUsed: number;
    reportUsed: number;
    bonusAnalysis: number;
    bonusReport: number;
  };
}

type Mode = "add_bonus" | "reset_usage" | "direct_set";

const MODE_LABELS: Record<Mode, string> = {
  add_bonus: "보너스 추가",
  reset_usage: "사용량 초기화",
  direct_set: "직접 수정",
};

export function QuotaAdjustForm({ regionId, workspaceId, current }: QuotaAdjustFormProps) {
  const [mode, setMode] = useState<Mode>("add_bonus");
  const [bonusAnalysis, setBonusAnalysis] = useState("0");
  const [bonusReport, setBonusReport] = useState("0");
  const [analysisUsed, setAnalysisUsed] = useState(String(current.analysisUsed));
  const [reportUsed, setReportUsed] = useState(String(current.reportUsed));
  const [directBonusAnalysis, setDirectBonusAnalysis] = useState(String(current.bonusAnalysis));
  const [directBonusReport, setDirectBonusReport] = useState(String(current.bonusReport));
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!reason.trim()) { toast.error("사유를 입력하세요."); return; }

      startTransition(async () => {
        const payload: Record<string, unknown> = { regionId, workspaceId, mode, reason };

        switch (mode) {
          case "add_bonus":
            payload.bonusAnalysis = parseInt(bonusAnalysis, 10) || 0;
            payload.bonusReport = parseInt(bonusReport, 10) || 0;
            break;
          case "direct_set":
            payload.analysisUsed = parseInt(analysisUsed, 10) || 0;
            payload.reportUsed = parseInt(reportUsed, 10) || 0;
            payload.bonusAnalysis = parseInt(directBonusAnalysis, 10) || 0;
            payload.bonusReport = parseInt(directBonusReport, 10) || 0;
            break;
        }

        const result = await adjustQuota(payload);
        if (!result.success) { toast.error(result.error); return; }
        toast.success("건수가 조정되었습니다.");
        setReason("");
        if (mode === "add_bonus") {
          setBonusAnalysis("0");
          setBonusReport("0");
        }
      });
    },
    [regionId, workspaceId, mode, reason, bonusAnalysis, bonusReport, analysisUsed, reportUsed, directBonusAnalysis, directBonusReport],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {(Object.entries(MODE_LABELS) as [Mode, string][]).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={mode === key ? "default" : "outline"}
            size="sm"
            onClick={() => setMode(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {mode === "add_bonus" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bonus-analysis">분석 보너스 수량</Label>
            <Input id="bonus-analysis" type="number" value={bonusAnalysis} onChange={(e) => setBonusAnalysis(e.target.value)} placeholder="예: 10 또는 -5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bonus-report">리포트 보너스 수량</Label>
            <Input id="bonus-report" type="number" value={bonusReport} onChange={(e) => setBonusReport(e.target.value)} placeholder="예: 5 또는 -3" />
          </div>
        </div>
      )}

      {mode === "reset_usage" && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
          분석 사용량과 리포트 사용량이 0으로 초기화되며, 사용 기간이 현재 시점으로 재설정됩니다.
        </div>
      )}

      {mode === "direct_set" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="direct-analysis-used">분석 사용</Label>
            <Input id="direct-analysis-used" type="number" min={0} value={analysisUsed} onChange={(e) => setAnalysisUsed(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct-report-used">리포트 사용</Label>
            <Input id="direct-report-used" type="number" min={0} value={reportUsed} onChange={(e) => setReportUsed(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct-bonus-analysis">보너스 분석</Label>
            <Input id="direct-bonus-analysis" type="number" min={0} value={directBonusAnalysis} onChange={(e) => setDirectBonusAnalysis(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct-bonus-report">보너스 리포트</Label>
            <Input id="direct-bonus-report" type="number" min={0} value={directBonusReport} onChange={(e) => setDirectBonusReport(e.target.value)} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="quota-reason">사유</Label>
        <Textarea id="quota-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="건수 조정 사유를 입력하세요" rows={2} />
      </div>

      <Button type="submit" disabled={isPending || !reason.trim()}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {MODE_LABELS[mode]}
      </Button>
    </form>
  );
}
