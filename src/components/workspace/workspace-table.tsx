"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BatchCreditDialog } from "@/components/workspace/batch-credit-dialog";
import type { WorkspaceListItem } from "@/actions/workspace/get-workspaces";

interface WorkspaceTableProps {
  workspaces: WorkspaceListItem[];
  regionId: string;
}

const PLAN_BADGE: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  PRO: "bg-blue-100 text-blue-700",
};

export function WorkspaceTable({ workspaces, regionId }: WorkspaceTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(workspaces.map((ws) => ws.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [workspaces],
  );

  const handleBatchComplete = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  if (workspaces.length === 0) {
    return <p className="text-sm text-muted-foreground">워크스페이스가 없습니다.</p>;
  }

  const isAllSelected = workspaces.length > 0 && selectedIds.size === workspaces.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < workspaces.length;

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3">
          <BatchCreditDialog
            regionId={regionId}
            workspaceIds={Array.from(selectedIds)}
            onComplete={handleBatchComplete}
          />
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => handleToggleAll(checked === true)}
                  aria-label="전체 선택"
                />
              </TableHead>
              <TableHead>이름</TableHead>
              <TableHead>플랜</TableHead>
              <TableHead className="text-right">크레딧</TableHead>
              <TableHead className="text-right">멤버</TableHead>
              <TableHead className="text-right">문서</TableHead>
              <TableHead className="text-right">ESG 완료</TableHead>
              <TableHead>생성일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces.map((ws) => (
              <TableRow key={ws.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(ws.id)}
                    onCheckedChange={(checked) => handleToggle(ws.id, checked === true)}
                    aria-label={`${ws.name} 선택`}
                  />
                </TableCell>
                <TableCell>
                  <Link href={`/${regionId}/workspaces/${ws.id}`} className="font-medium hover:underline">
                    {ws.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge className={PLAN_BADGE[ws.planCode] ?? PLAN_BADGE.FREE}>{ws.planCode}</Badge>
                </TableCell>
                <TableCell className="text-right">{ws.creditBalance.toLocaleString()}</TableCell>
                <TableCell className="text-right">{ws.memberCount}</TableCell>
                <TableCell className="text-right">{ws.documentCount}</TableCell>
                <TableCell className="text-right">{ws.esgCompletedCount}/69</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(ws.createdAt).toLocaleDateString("ko-KR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
