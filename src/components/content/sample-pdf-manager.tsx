"use client";

import { useState, useCallback, useTransition } from "react";
import { RefreshCw, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { regenerateSamplePdf } from "@/actions/content/regenerate-sample-pdf";
import type { SamplePdfMeta } from "@/lib/s3";

interface Props {
  regionId: string;
  initialMeta: SamplePdfMeta;
}

export function SamplePdfManager({ regionId, initialMeta }: Props) {
  const [meta, setMeta] = useState(initialMeta);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRegenerate = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await regenerateSamplePdf({ regionId });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMeta({
        exists: true,
        sizeBytes: result.data.sizeBytes,
        lastModified: result.data.generatedAt,
      });
      setSuccessMessage("샘플 PDF가 성공적으로 생성되었습니다.");
    });
  }, [regionId]);

  const fileType = regionId === "kr" ? "진단보고서" : "스코어카드";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          샘플 {fileType} PDF
        </CardTitle>
        <CardDescription>
          랜딩 페이지 다운로드 버튼에서 제공되는 예시 PDF입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">상태</p>
            <p className="mt-1 flex items-center gap-1 font-medium">
              {meta.exists ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> 존재
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-600" /> 없음
                </>
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">파일 크기</p>
            <p className="mt-1 font-medium">
              {meta.sizeBytes
                ? `${(meta.sizeBytes / 1024).toFixed(1)} KB`
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">마지막 생성</p>
            <p className="mt-1 font-medium">
              {meta.lastModified
                ? new Date(meta.lastModified).toLocaleString("ko-KR")
                : "-"}
            </p>
          </div>
        </div>

        <Button onClick={handleRegenerate} disabled={isPending}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`}
          />
          {isPending ? "생성 중..." : "샘플 PDF 재생성"}
        </Button>
      </CardContent>
    </Card>
  );
}
