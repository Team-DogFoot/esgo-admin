/**
 * Base application error.
 *
 * All domain-specific errors extend this class. Provides:
 * - `code`: Machine-readable error code for log filtering and programmatic handling
 * - `statusCode`: HTTP status code for automatic API response mapping
 * - `context`: Structured data for debugging (logged but never exposed to users)
 * - `isOperational`: true = expected business error (warn level),
 *                     false = unexpected bug (error level)
 */
export class AppError extends Error {
  public readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Authentication & Authorization ──────────────────────────────

export class AuthenticationError extends AppError {
  constructor(message = "로그인이 필요합니다.") {
    super(message, "AUTHENTICATION_REQUIRED", 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "접근 권한이 없습니다.", context?: Record<string, unknown>) {
    super(message, "FORBIDDEN", 403, context);
  }
}

// ─── Resource Errors ─────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource}을(를) 찾을 수 없습니다.`, "NOT_FOUND", 404, { resource, id });
  }
}

// ─── Validation ──────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

// ─── Billing & Quota ─────────────────────────────────────────────

export class InsufficientCreditsError extends AppError {
  constructor(required: number, available: number) {
    super("크레딧이 부족합니다.", "INSUFFICIENT_CREDITS", 402, { required, available });
  }
}

export class QuotaExceededError extends AppError {
  constructor(resource: string, limit: number) {
    super(`${resource} 한도에 도달했습니다.`, "QUOTA_EXCEEDED", 429, { resource, limit });
  }
}

// ─── External Services ───────────────────────────────────────────

export class ExternalServiceError extends AppError {
  constructor(service: string, cause?: unknown) {
    super(`${service} 서비스 연결에 실패했습니다.`, "EXTERNAL_SERVICE_ERROR", 502, {
      service,
      originalError: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

// ─── Concurrency ─────────────────────────────────────────────────

export class ConcurrencyError extends AppError {
  constructor(message = "다른 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.") {
    super(message, "CONCURRENCY_ERROR", 409);
  }
}

// ─── Pipeline-Specific ───────────────────────────────────────────

export class PipelineError extends AppError {
  constructor(
    phase: "preprocess" | "classify" | "extract",
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message, `PIPELINE_${phase.toUpperCase()}_ERROR`, 500, { phase, ...context });
  }
}

// ─── Utility: Type Guard ─────────────────────────────────────────

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  return "예상치 못한 오류가 발생했습니다.";
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof AppError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { value: String(error) };
}
