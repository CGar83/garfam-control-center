"use client";

import { format } from "date-fns";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { paletteForMember } from "@/lib/member-colors";
import type { Milestone } from "@/lib/types";
import { cn } from "@/lib/utils";
import { countdownLabel, type CountdownItem } from "@/components/memories/helpers";

interface CountdownRowProps {
  items: CountdownItem[];
  isParent: boolean;
  onAdd: () => void;
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
}

export function CountdownRow({ items, isParent, onAdd, onEdit, onDelete }: CountdownRowProps) {
  const { members, findMember } = useFamilyMembers();

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar" role="list" aria-label="Upcoming countdowns">
      {items.map(({ milestone, days, next, turning }, index) => {
        const member = findMember(milestone.member_id);
        const palette = paletteForMember(member, members);
        const today = days === 0;
        return (
          <div
            key={milestone.id}
            role="listitem"
            className={cn(
              "record-tile relative flex w-[164px] shrink-0 flex-col justify-between gap-3 border-t-4 p-4 fade-up sm:w-[184px]",
              today && "pop-in ring-2 ring-primary/40"
            )}
            style={{ borderTopColor: milestone.member_id ? palette.solid : "hsl(var(--primary))", animationDelay: `${Math.min(index, 6) * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-3xl leading-none" aria-hidden>
                {milestone.emoji || "⭐"}
              </span>
              {isParent ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-9 w-9 rounded-full" aria-label={`Options for ${milestone.title}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onEdit(milestone)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(milestone)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-wrap-safe line-clamp-2 text-sm font-semibold leading-snug">{milestone.title}</p>
              <p className={cn("mt-1 text-lg font-bold leading-tight", today ? "text-primary" : "text-foreground")}>{countdownLabel(days)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {format(next, "EEE, MMM d")}
                {turning !== null ? ` · turning ${turning}` : ""}
              </p>
            </div>
            {member ? (
              <div className="flex items-center gap-2">
                <MemberAvatar member={member} size="xs" />
                <span className="truncate text-xs font-medium" style={{ color: palette.ink }}>
                  {member.display_name.split(" ")[0]}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Whole family</span>
            )}
          </div>
        );
      })}
      {isParent ? (
        <button
          type="button"
          onClick={onAdd}
          className="record-tile flex w-[140px] shrink-0 flex-col items-center justify-center gap-2 border-dashed p-4 text-center text-sm font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground active:scale-[0.97] focus-ring"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Plus className="h-5 w-5" />
          </span>
          Add countdown
        </button>
      ) : null}
    </div>
  );
}
