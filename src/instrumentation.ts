export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerGlobalErrorHandlers } = await import("@/lib/global-error-handlers");
    registerGlobalErrorHandlers();
  }
}
