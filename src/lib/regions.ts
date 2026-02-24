import { env } from "@/lib/env";

export interface Region {
  id: string;
  name: string;
  domain: string;
  flag: string;
}

export const regions: Region[] = env.REGIONS;

export function getRegion(regionId: string): Region | undefined {
  return regions.find((r) => r.id === regionId);
}

export function getDatabaseUrl(regionId: string): string {
  const envKey = `DATABASE_URL_${regionId.toUpperCase()}`;
  const url = process.env[envKey];
  if (!url) {
    throw new Error(`Missing environment variable: ${envKey}`);
  }
  return url;
}
