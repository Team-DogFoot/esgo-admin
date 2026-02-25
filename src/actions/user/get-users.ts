"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError } from "@/lib/errors";

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

export const getUsers = createAction(
  { module: "get-users" },
  async (_session, input: GetUsersInput): Promise<UserListItem[]> => {
    const region = getRegion(input.regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(input.regionId);

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

    return users.map((u) => ({
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
  },
);
