import { PrismaClient, PlanCode, CreditType, PaymentStatus, SubscriptionStatus } from "../../node_modules/.prisma/client-kr";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "@/lib/regions";

export { PlanCode, CreditType, PaymentStatus, SubscriptionStatus };
export type { PrismaClient };

const clientCache = new Map<string, PrismaClient>();

export function getPrismaClient(regionId: string): PrismaClient {
  const cached = clientCache.get(regionId);
  if (cached) return cached;

  const adapter = new PrismaPg({ connectionString: getDatabaseUrl(regionId) });
  const client = new PrismaClient({ adapter });

  clientCache.set(regionId, client);
  return client;
}
