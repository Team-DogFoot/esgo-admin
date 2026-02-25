import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "error" | "info" | "default" | "muted";

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-700 border-green-200",
  warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
  error: "bg-red-100 text-red-700 border-red-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
  default: "bg-gray-100 text-gray-700 border-gray-200",
  muted: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(VARIANT_CLASSES[variant], className)}>
      {children}
    </Badge>
  );
}
