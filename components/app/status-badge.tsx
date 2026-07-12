import { Badge } from "@/components/ui/badge";
import { taskStatusLabel, titleCase } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status ?? "open";
  const variant =
    normalized === "done" || normalized === "paid" || normalized === "complete"
      ? "success"
      : normalized === "overdue" || normalized === "urgent"
        ? "destructive"
        : normalized === "waiting" || normalized === "upcoming"
          ? "warning"
          : "info";

  return <Badge variant={variant}>{normalized.includes("_") ? taskStatusLabel(normalized) : titleCase(normalized)}</Badge>;
}
