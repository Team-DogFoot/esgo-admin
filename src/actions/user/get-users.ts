"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-users" });

export interface UserListItem {
  id: string;
  name: string | null;
  email: string | null;
  workspaces: { name: string; role: string }[];
  workspaceCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface GetUsersInput {
  regionId: string;
  search?: string;
}

export async function getUsers(input: GetUsersInput): Promise<ActionResult<UserListItem[]>> {
  const region = getRegion(input.regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(input.regionId);
  log.info({ regionId: input.regionId }, "getUsers started");

  try {
    const where = input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { email: { contains: input.search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      include: {
        memberships: {
          include: { workspace: { select: { name: true } } },
        },
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const items: UserListItem[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      workspaces: u.memberships.map((m) => ({
        name: m.workspace.name,
        role: m.role,
      })),
      workspaceCount: u._count.memberships,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    log.info({ regionId: input.regionId, count: items.length }, "getUsers succeeded");
    return ok(items);
  } catch (error) {
    log.error({ err: error, regionId: input.regionId }, "getUsers failed");
    return fail("사용자 목록 조회에 실패했습니다.");
  }
}
