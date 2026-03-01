import { PrismaClient as PrismaClientKR, PlanCode, PaymentStatus, SubscriptionStatus, AiProvider } from "../../node_modules/.prisma/client-kr";
import { PrismaClient as PrismaClientVN } from "../../node_modules/.prisma/client-vn";
import { PrismaClient as PrismaClientMX } from "../../node_modules/.prisma/client-mx";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "@/lib/regions";

export { PlanCode, PaymentStatus, SubscriptionStatus, AiProvider };
export type { PrismaClientKR as PrismaClient };

type PrismaClientConstructor = new (opts: { adapter: PrismaPg }) => PrismaClientKR;

const ClientMap: Record<string, PrismaClientConstructor> = {
  kr: PrismaClientKR,
  vn: PrismaClientVN as unknown as PrismaClientConstructor,
  mx: PrismaClientMX as unknown as PrismaClientConstructor,
};

const clientCache = new Map<string, PrismaClientKR>();

export function getPrismaClient(regionId: string): PrismaClientKR {
  const cached = clientCache.get(regionId);
  if (cached) return cached;

  const Client = ClientMap[regionId];
  if (!Client) throw new Error(`Unknown region: ${regionId}`);

  const adapter = new PrismaPg({ connectionString: getDatabaseUrl(regionId) });
  const client = new Client({ adapter });

  clientCache.set(regionId, client);
  return client;
}
