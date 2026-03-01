import { z } from "zod";

const regionSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  flag: z.string(),
});

const serverSchema = z.object({
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_TRUST_HOST: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ADMIN_EMAILS: z.string().min(1, "ADMIN_EMAILS is required"),
  REGIONS: z
    .string()
    .transform((v) => JSON.parse(v))
    .pipe(z.array(regionSchema).min(1, "At least one region is required")),
  AWS_REGION: z.string().min(1, "AWS_REGION is required"),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
  INTERNAL_API_KEY: z.string().min(1, "INTERNAL_API_KEY is required"),
  LOG_LEVEL: z.string().optional(),
});

function validateEnv() {
  const result = serverSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid environment variables:\n${formatted}\n\nCheck .env.example for reference.`,
    );
  }

  return result.data;
}

export const env = validateEnv();
