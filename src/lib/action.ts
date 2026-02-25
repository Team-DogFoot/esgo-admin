"use server";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { AppLogger } from "@/lib/logger";
import { AppError, ValidationError } from "@/lib/errors";
import type { Session } from "next-auth";

// ─── Types ──────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export interface ActionOptions {
  module: string;
  public?: boolean;
}

// ─── Result Helpers ─────────────────────────────────────────────

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { success: false, error, fieldErrors };
}

// ─── createAction ───────────────────────────────────────────────

export function createAction<T, Args extends unknown[]>(
  options: ActionOptions,
  handler: (session: Session, ...args: Args) => Promise<T>,
): (...args: Args) => Promise<ActionResult<T>> {
  const log = logger.child({ module: options.module });

  return async (...args: Args): Promise<ActionResult<T>> => {
    const session = await auth();

    if (!options.public && !session?.user?.id) {
      return fail("로그인이 필요합니다.");
    }

    try {
      const result = await handler(session as Session, ...args);
      return ok(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        log.warn({ code: error.code, context: error.context }, error.message);
        return fail(error.message, error.fieldErrors);
      }

      if (error instanceof AppError) {
        log.warn({ code: error.code, context: error.context }, error.message);
        return fail(error.message);
      }

      log.error({ err: error }, "예상치 못한 오류가 발생했습니다.");
      return fail("예상치 못한 오류가 발생했습니다.");
    }
  };
}

// ─── createRawAction ────────────────────────────────────────────

export function createRawAction<T, Args extends unknown[]>(
  options: ActionOptions,
  handler: (session: Session, log: AppLogger, ...args: Args) => Promise<ActionResult<T>>,
): (...args: Args) => Promise<ActionResult<T>> {
  const log = logger.child({ module: options.module });

  return async (...args: Args): Promise<ActionResult<T>> => {
    const session = await auth();

    if (!options.public && !session?.user?.id) {
      return fail("로그인이 필요합니다.");
    }

    return handler(session as Session, log, ...args);
  };
}
