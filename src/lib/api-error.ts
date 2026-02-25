import { NextResponse } from "next/server";
import { isAppError } from "@/lib/errors";
import type { AppLogger } from "@/lib/logger";

/**
 * Creates a standardized JSON error response from any error.
 *
 * - AppError: Uses the error's statusCode, code, and message
 * - Unknown errors: Returns 500 with generic message
 */
export function errorResponse(error: unknown, log: AppLogger): NextResponse {
  if (isAppError(error)) {
    log.warn({ code: error.code, context: error.context }, error.message);
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }

  log.error({ err: error }, "unexpected API error");
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}
