"use client";

import { Check, MoreHorizontal, Pause, Pencil, Play, Sparkles, Trash2 } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { ProgressRing } from "@/components/app/progress-ring";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { paletteForMember } from "@/lib/member-colors";
import type { FamilyMember, Routine, RoutineCompletion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { cheerFor, memberFirstName, routineProgress } from "./helpers";

interface RoutineCardProps {
  routine: Routine;
  completion: RoutineCompletion | null;
  members: FamilyMember[];
  canToggle: boolean;
  isParent: boolean;
  onToggleStep: (index: number) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleActive?: () => void;
}

export function RoutineCard({ routine, completion, members, canToggle, isParent, onToggleStep, onEdit, onDelete, onToggleActive }: RoutineCardProps) {
  const member = members.find((item) => item.id === routine.member_id) ?? null;
  const palette = paletteForMember(member, members);
  const progress = routineProgress(routine, completion);
  const complete = progress.total > 0 && progress.done === progress.total;
  const stepsDone = new Set(completion?.steps_done ?? []);

  return (
    <Card className={cn("overflow-hidden border-l-4 transition-colors", complete && "bg-emerald-50/50 dark:bg-emerald-950/20")} style={{ borderLeftColor: palette.solid }}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <ProgressRing value={progress.percent} size={56} stroke={6} color={palette.solid} label={`${routine.title}: ${progress.done} of ${progress.total} steps done`}>
            <span className="text-xl" aria-hidden>
              {routine.emoji ?? "✅"}
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold leading-tight">{routine.title}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MemberAvatar member={member} size="xs" />
              {member ? memberFirstName(member) : "Whole family"} · {progress.done}/{progress.total} steps
            </p>
          </div>
          {isParent && (onEdit || onDelete || onToggleActive) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2 h-9 w-9" aria-label={`More options for ${routine.title}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit ? (
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                ) : null}
                {onToggleActive ? (
                  <DropdownMenuItem onSelect={onToggleActive}>
                    {routine.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {routine.active ? "Pause routine" : "Resume routine"}
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <ul className="mt-3 space-y-1.5">
          {routine.steps.map((step, index) => {
            const done = stepsDone.has(index);
            return (
              <li key={`${index}-${step}`}>
                <button
                  type="button"
                  aria-pressed={done}
                  disabled={!canToggle}
                  onClick={() => onToggleStep(index)}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-all focus-ring",
                    canToggle ? "hover:bg-muted/70 active:scale-[0.98]" : "cursor-default",
                    done && "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      done ? "border-transparent text-white" : "border-border bg-white/70 text-transparent dark:bg-white/5"
                    )}
                    style={done ? { backgroundColor: palette.solid, color: palette.onSolid } : undefined}
                    aria-hidden
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className={cn("min-w-0 flex-1 font-medium", done && "line-through")}>{step}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {complete ? (
          <div className="pop-in mt-3 flex items-center gap-2 rounded-xl bg-emerald-100/80 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" role="status">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            {cheerFor(routine.id, member ? memberFirstName(member) : "team")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
