import { Badge } from "@/components/ui/badge";
import { priorityLabel } from "@/lib/utils";

interface PriorityBadgeProps {
  priority?: string | null;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const variant = priority === "urgent" ? "destructive" : priority === "high" ? "warning" : priority === "low" ? "secondary" : "info";
  return <Badge variant={variant}>{priorityLabel(priority)}</Badge>;
}
