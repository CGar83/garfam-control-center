"use client";

import type { ReactNode } from "react";
import { addDays, format, isSameDay, isToday, subDays } from "date-fns";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { paletteForMember } from "@/lib/member-colors";
import { choreCompletedOn, choreIsDueOn } from "@/lib/streaks";
import type { Chore, ChoreCompletion, FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { memberFirstName, pointsForChoreInWeek, sortByTimeOfDay, weekDaysFor } from "./helpers";

interface WeekChartProps {
  members: FamilyMember[];
  orderedMembers: FamilyMember[];
  chores: Chore[];
  completions: ChoreCompletion[];
  anchor: Date;
  today: Date;
  onAnchorChange: (date: Date) => void;
  canToggle: (chore: Chore, date: Date) => boolean;
  onToggle: (chore: Chore, date: Date) => void;
  emptyAction?: ReactNode;
}

type Row = { kind: "header"; key: string; member: FamilyMember | null } | { kind: "chore"; key: string; member: FamilyMember | null; chore: Chore };

export function WeekChart({ members, orderedMembers, chores, completions, anchor, today, onAnchorChange, canToggle, onToggle, emptyAction }: WeekChartProps) {
  const days = weekDaysFor(anchor);
  const isCurrentWeek = days.some((day) => isSameDay(day, today));
  const activeChores = chores.filter((chore) => chore.active);

  const rows: Row[] = [];
  for (const member of orderedMembers) {
    const mine = sortByTimeOfDay(activeChores.filter((chore) => chore.assigned_to === member.id));
    if (mine.length === 0) continue;
    rows.push({ kind: "header", key: `header-${member.id}`, member });
    for (const chore of mine) rows.push({ kind: "chore", key: chore.id, member, chore });
  }
  const unassigned = sortByTimeOfDay(activeChores.filter((chore) => !chore.assigned_to));
  if (unassigned.length > 0) {
    rows.push({ kind: "header", key: "header-unassigned", member: null });
    for (const chore of unassigned) rows.push({ kind: "chore", key: chore.id, member: null, chore });
  }

  return (
    <div className="app-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => onAnchorChange(subDays(anchor, 7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next week" onClick={() => onAnchorChange(addDays(anchor, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek ? (
            <Button variant="ghost" size="sm" onClick={() => onAnchorChange(today)}>
              This week
            </Button>
          ) : null}
        </div>
        <p className="text-sm font-semibold">
          {format(days[0], "MMM d")} – {format(days[6], "MMM d, yyyy")}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No chores on the chart yet" description="Add a chore and it shows up here as a row you can check off day by day." action={emptyAction} />
      ) : (
        <div className="surface-panel overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-44 bg-white/95 px-3 py-2 text-left text-xs font-semibold text-muted-foreground backdrop-blur dark:bg-card/95">Chore</th>
                {days.map((day) => {
                  const current = isToday(day);
                  return (
                    <th key={day.toISOString()} className={cn("px-1 py-2 text-center text-xs font-semibold", current ? "text-primary" : "text-muted-foreground")}>
                      <span className="block">{format(day, "EEE")}</span>
                      <span className={cn("mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px]", current && "bg-primary text-primary-foreground")}>{format(day, "d")}</span>
                    </th>
                  );
                })}
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                if (row.kind === "header") {
                  const palette = paletteForMember(row.member, members);
                  return (
                    <tr key={row.key}>
                      <td colSpan={9} className="px-3 pb-1 pt-3">
                        <span className="inline-flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-3 text-xs font-semibold" style={{ backgroundColor: palette.soft, color: palette.ink }}>
                          <MemberAvatar member={row.member} size="xs" />
                          {row.member ? memberFirstName(row.member) : "Family"}
                        </span>
                      </td>
                    </tr>
                  );
                }
                const chore = row.chore;
                const palette = paletteForMember(row.member, members);
                return (
                  <tr key={row.key} className="group">
                    <td className="sticky left-0 z-10 bg-white/95 px-3 py-1.5 backdrop-blur dark:bg-card/95">
                      <span className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden>
                          {chore.emoji ?? "🧹"}
                        </span>
                        <span className="truncate font-medium">{chore.title}</span>
                      </span>
                    </td>
                    {days.map((day) => {
                      const due = choreIsDueOn(chore, day);
                      const done = due && Boolean(choreCompletedOn(completions, chore.id, day));
                      const current = isToday(day);
                      const allowed = due && canToggle(chore, day);
                      return (
                        <td key={day.toISOString()} className={cn("px-1 py-1.5 text-center", current && "bg-primary/5")}>
                          {due ? (
                            <button
                              type="button"
                              aria-pressed={done}
                              aria-label={`${chore.title} on ${format(day, "EEEE MMM d")}${done ? ", done" : ""}`}
                              disabled={!allowed}
                              onClick={() => onToggle(chore, day)}
                              className={cn(
                                "mx-auto flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-all focus-ring",
                                allowed && "active:scale-[0.92]",
                                !allowed && "cursor-default opacity-50",
                                done ? "border-transparent text-white" : "border-dashed border-border bg-white/60 text-transparent dark:bg-white/5"
                              )}
                              style={done ? { backgroundColor: palette.solid, color: palette.onSolid } : undefined}
                            >
                              <Check className="h-5 w-5" strokeWidth={3} />
                            </button>
                          ) : (
                            <span className="mx-auto block h-1 w-4 rounded-full bg-border" aria-hidden />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{chore.points > 0 ? pointsForChoreInWeek(completions, chore.id, days) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
