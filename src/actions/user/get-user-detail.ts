"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError, NotFoundError } from "@/lib/errors";

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
    analysisUsed: number;
    reportUsed: number;
    role: string;
    joinedAt: Date;
  }[];
  activity: {
    documentsUploaded: number;
    workspacesOwned: number;
    reportsCreated: number;
  };
}

export const getUserDetail = createAction(
  { module: "get-user-detail" },
  async (_session, regionId: string, userId: string): Promise<UserDetail> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: {
              select: { id: true, name: true, planCode: true, analysisUsed: true, reportUsed: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: {
          select: { Document: true, Report: true },
        },
      },
    });

    if (!user) throw new NotFoundError("사용자");

    let activeWorkspaceName: string | null = null;
    if (user.activeWorkspaceId) {
      const activeWs = await prisma.workspace.findUnique({
        where: { id: user.activeWorkspaceId },
        select: { name: true },
      });
      activeWorkspaceName = activeWs?.name ?? null;
    }

    const workspacesOwned = user.memberships.filter((m) => m.role === "OWNER").length;

    return {
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
        analysisUsed: m.workspace.analysisUsed,
        reportUsed: m.workspace.reportUsed,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      activity: {
        documentsUploaded: user._count.Document,
        workspacesOwned,
        reportsCreated: user._count.Report,
      },
    };
  },
);
