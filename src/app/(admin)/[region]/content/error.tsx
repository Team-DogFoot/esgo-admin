"use client";

import { ErrorState } from "@/components/error-state";

export default function ContentError({
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
      title="콘텐츠를 불러올 수 없습니다"
      description="콘텐츠 데이터를 불러오는 중 오류가 발생했습니다."
      homePath="/"
    />
  );
}
