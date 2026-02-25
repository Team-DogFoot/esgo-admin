"use client";

import { ErrorState } from "@/components/error-state";

export default function AiMonitorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="AI 모니터링을 불러올 수 없습니다"
      description="AI 모니터링 데이터를 불러오는 중 오류가 발생했습니다."
      homePath="/"
    />
  );
}
