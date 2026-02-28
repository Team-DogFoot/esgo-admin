"use server";

import { createAction } from "@/lib/action";
import { getPrismaClient } from "@/lib/prisma";
import { getRegion } from "@/lib/regions";
import { ValidationError, NotFoundError } from "@/lib/errors";

export interface WorkspaceDetail {
  id: string;
  name: string;
  businessNumber: string;
  planCode: string;
  analysisUsed: number;
  reportUsed: number;
  bonusAnalysis: number;
  bonusReport: number;
  createdAt: Date;
  members: {
    id: string;
    userId: string;
    userName: string | null;
    userEmail: string | null;
    role: string;
    joinedAt: Date;
  }[];
  esgProgress: {
    total: number;
    completed: number;
    inProgress: number;
  };
}

export const getWorkspaceDetail = createAction(
  { module: "get-workspace-detail" },
  async (_session, regionId: string, workspaceId: string): Promise<WorkspaceDetail> => {
    const region = getRegion(regionId);
    if (!region) throw new ValidationError("유효하지 않은 리전입니다.");

    const prisma = getPrismaClient(regionId);

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        },
        esgSummaries: {
          select: { status: true },
        },
      },
    });

    if (!workspace) throw new NotFoundError("워크스페이스");

    const esgTotal = workspace.esgSummaries.length;
    const esgCompleted = workspace.esgSummaries.filter((s) => s.status === "COMPLETED").length;
    const esgInProgress = workspace.esgSummaries.filter((s) => s.status === "IN_PROGRESS").length;

    return {
      id: workspace.id,
      name: workspace.name,
      businessNumber: workspace.businessNumber,
      planCode: workspace.planCode,
      analysisUsed: workspace.analysisUsed,
      reportUsed: workspace.reportUsed,
      bonusAnalysis: workspace.bonusAnalysis,
      bonusReport: workspace.bonusReport,
      createdAt: workspace.createdAt,
      members: workspace.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.name,
        userEmail: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      esgProgress: { total: esgTotal, completed: esgCompleted, inProgress: esgInProgress },
    };
  },
);
