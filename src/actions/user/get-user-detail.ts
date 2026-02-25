"use server";

import { ok, fail, type ActionResult } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "get-user-detail" });

export interface UserDetail {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
  activeWorkspaceName: string | null;
  workspaces: {
    id: string;
    name: string;
    planCode: string;
    creditBalance: number;
    role: string;
    joinedAt: Date;
  }[];
  activity: {
    documentsUploaded: number;
    workspacesOwned: number;
    reportsCreated: number;
  };
}

export async function getUserDetail(
  regionId: string,
  userId: string,
): Promise<ActionResult<UserDetail>> {
  const region = getRegion(regionId);
  if (!region) return fail("유효하지 않은 리전입니다.");

  const prisma = getPrismaClient(regionId);
  log.info({ regionId, userId }, "getUserDetail started");

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: {
              select: { id: true, name: true, planCode: true, creditBalance: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: {
          select: { Document: true, Report: true },
        },
      },
    });

    if (!user) return fail("사용자를 찾을 수 없습니다.");

    let activeWorkspaceName: string | null = null;
    if (user.activeWorkspaceId) {
      const activeWs = await prisma.workspace.findUnique({
        where: { id: user.activeWorkspaceId },
        select: { name: true },
      });
      activeWorkspaceName = activeWs?.name ?? null;
    }

    const workspacesOwned = user.memberships.filter((m) => m.role === "OWNER").length;

    const detail: UserDetail = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      activeWorkspaceName,
      workspaces: user.memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        planCode: m.workspace.planCode,
        creditBalance: m.workspace.creditBalance,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      activity: {
        documentsUploaded: user._count.Document,
        workspacesOwned,
        reportsCreated: user._count.Report,
      },
    };

    log.info({ regionId, userId }, "getUserDetail succeeded");
    return ok(detail);
  } catch (error) {
    log.error({ err: error, regionId, userId }, "getUserDetail failed");
    return fail("사용자 상세 조회에 실패했습니다.");
  }
}
