import { Badge } from "@/components/ui/badge";

type BadgeVariant = "success" | "warning" | "error" | "info" | "default" | "muted";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  default: "bg-gray-100 text-gray-700",
  muted: "bg-muted text-muted-foreground",
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  return <Badge className={VARIANT_CLASSES[variant]}>{children}</Badge>;
}
