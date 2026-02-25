import pino from "pino";
import type { Logger } from "pino";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

export type AppLogger = Logger;

export const logger = pino({
  level: env.LOG_LEVEL ?? (env.NODE_ENV === "production" ? "info" : "debug"),
  ...(env.NODE_ENV !== "production" && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
});

/**
 * Creates a child logger with a unique requestId for tracing
 * all log entries across a single request/action execution.
 */
export function createRequestLogger(module: string) {
  return logger.child({ module, requestId: randomUUID().slice(0, 8) });
}
