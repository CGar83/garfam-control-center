"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MemberAvatarStack } from "@/components/app/member-avatar";
import { kindLabels, listAssignees, listLastUpdated, listProgress } from "@/components/lists/helpers";
import type { ListItem, SharedList } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ListCardProps {
  list: SharedList;
  items: ListItem[];
  active?: boolean;
  compact?: boolean;
  onSelect: () => void;
}

export function ListCard({ list, items, active, compact, onSelect }: ListCardProps) {
  const progress = listProgress(items);
  const assignees = listAssignees(items);
  const updated = listLastUpdated(list, items);
  const allDone = progress.total > 0 && progress.done === progress.total;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "surface-panel group flex w-full min-w-0 flex-col gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] focus-ring",
        active && "border-primary/60 ring-2 ring-primary/30",
        compact && "gap-2 p-3"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn("flex shrink-0 items-center justify-center rounded-2xl bg-muted", compact ? "h-10 w-10 text-xl" : "h-12 w-12 text-2xl")}
          aria-hidden
        >
          {list.emoji || "📝"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className={cn("min-w-0 truncate font-semibold text-foreground", compact ? "text-sm" : "text-base")}>{list.name}</h3>
            <Badge variant="outline" className="shrink-0">
              {kindLabels[list.kind] ?? list.kind}
            </Badge>
          </div>
          {!compact && list.description ? <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{list.description}</p> : null}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className={cn(allDone && "font-medium text-emerald-700 dark:text-emerald-300")}>
            {progress.total === 0 ? "Nothing on it yet" : allDone ? "All done" : `${progress.done} of ${progress.total} done`}
          </span>
          <span className="truncate">{formatDistanceToNow(updated, { addSuffix: true })}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={cn("h-full rounded-full transition-all duration-500", allDone ? "bg-[#ACE1AF]" : "bg-primary")}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {assignees.length ? (
        <div className="flex items-center justify-between gap-2">
          <MemberAvatarStack memberIds={assignees} size="xs" />
        </div>
      ) : null}
    </button>
  );
}
