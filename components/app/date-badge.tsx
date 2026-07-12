import { Badge } from "@/components/ui/badge";
import { formatDate, isDueSoon, isOverdue } from "@/lib/utils";

interface DateBadgeProps {
  value?: string | null;
  includeTime?: boolean;
}

export function DateBadge({ value }: DateBadgeProps) {
  const variant = isOverdue(value) ? "destructive" : isDueSoon(value) ? "warning" : "outline";
  return <Badge variant={variant}>{formatDate(value)}</Badge>;
}
