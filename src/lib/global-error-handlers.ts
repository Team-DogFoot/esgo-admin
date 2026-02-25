import { logger } from "@/lib/logger";

const log = logger.child({ module: "global" });

/**
 * Registers process-level error handlers for catching errors
 * that escape all other error handling layers.
 *
 * Call once during app initialization (e.g., in instrumentation.ts).
 */
export function registerGlobalErrorHandlers() {
  process.on("unhandledRejection", (reason) => {
    log.error(
      { err: reason },
      "unhandled promise rejection — this indicates a missing error handler",
    );
  });

  process.on("uncaughtException", (error) => {
    log.fatal({ err: error }, "uncaught exception — process may be unstable");
    // Do NOT call process.exit() — let the container orchestrator handle restart.
    // Exiting here could mask the error in K8s logs.
  });
}
