export function getActivityStatus(
  updatedAt: Date,
): { variant: "success" | "warning" | "muted"; label: string } {
  const now = new Date();
  const diffMs = now.getTime() - new Date(updatedAt).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 7) return { variant: "success", label: "활성" };
  if (diffDays <= 30) return { variant: "warning", label: "비활성" };
  return { variant: "muted", label: "휴면" };
}
