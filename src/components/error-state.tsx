"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description: string;
  /** Where the "홈으로" button navigates. Defaults to "/" (region selector) */
  homePath?: string;
}

export function ErrorState({
  error,
  reset,
  title,
  description,
  homePath = "/",
}: ErrorStateProps) {
  useEffect(() => {
    // Client-side error boundaries can't use Pino (server-only).
    // console.error is acceptable here per CLAUDE.md conventions.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-2 text-muted-foreground">{description}</p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">참조 ID: {error.digest}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset}>다시 시도</Button>
          <Button variant="outline" asChild>
            <Link href={homePath}>홈으로</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
