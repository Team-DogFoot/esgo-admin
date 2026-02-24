import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: path.join(__dirname, "..", "..", ".env.local") });
config({ path: path.join(__dirname, "..", "..", ".env") });

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL_KR!,
  },
});
