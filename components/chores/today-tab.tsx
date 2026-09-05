"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { MemberAvatar } from "@/components/app/member-avatar";
import { EmptyState } from "@/components/app/empty-state";
import { paletteForMember } from "@/lib/member-colors";
import { choreCompletedOn, choreIsDueOn, choresDueForMember } from "@/lib/streaks";
import type { Chore, ChoreCompletion, FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { memberFirstName, sortByTimeOfDay, timeOfDayEmoji, timeOfDayLabel } from "./helpers";

interface ChoreTileProps {
  chore: Chore;
  completed: boolean;
  disabled?: boolean;
  accent: string;
  onToggle: () => void;
}

export function ChoreTile({ chore, completed, disabled, accent, onToggle }: ChoreTileProps) {
  return (
    <button
      type="button"
      aria-pressed={completed}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "record-tile relative flex min-h-[5.5rem] w-full items-center gap-3 text-left transition-all focus-ring",
        !disabled && "hover:border-foreground/20 active:scale-[0.97]",
        completed && "bg-emerald-50/70 dark:bg-emerald-950/30",
        disabled && "cursor-default opacity-70"
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: accent }}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl" aria-hidden>
        {chore.emoji ?? "🧹"}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-base font-semibold", completed && "line-through text-muted-foreground")}>{chore.title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {timeOfDayEmoji[chore.time_of_day]} {timeOfDayLabel[chore.time_of_day]}
          {chore.points > 0 ? ` · ${chore.points} pts` : ""}
        </span>
      </span>
      {completed ? (
        <span className="pop-in shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white dark:bg-emerald-500">
          {chore.points > 0 ? `+${chore.points} pts` : "Done"}
        </span>
      ) : null}
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          completed ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500" : "border-border bg-white/70 text-transparent dark:bg-white/5"
        )}
        aria-hidden
      >
        <Check className="h-5 w-5" strokeWidth={3} />
      </span>
    </button>
  );
}

interface TodayTabProps {
  members: FamilyMember[];
  orderedMembers: FamilyMember[];
  chores: Chore[];
  completions: ChoreCompletion[];
  today: Date;
  canToggle: (chore: Chore) => boolean;
  onToggle: (chore: Chore) => void;
  emptyAction?: ReactNode;
}

export function TodayTab({ members, orderedMembers, chores, completions, today, canToggle, onToggle, emptyAction }: TodayTabProps) {
  const groups = orderedMembers
    .map((member) => ({ member, due: sortByTimeOfDay(choresDueForMember(chores, member.id, today)) }))
    .filter((group) => group.due.length > 0);
  const unassigned = sortByTimeOfDay(chores.filter((chore) => !chore.assigned_to && choreIsDueOn(chore, today)));

  if (groups.length === 0 && unassigned.length === 0) {
    return <EmptyState title="Nothing due today. Nice." description="No chores are scheduled for today. Enjoy the breather, or add one from the Manage tab." action={emptyAction} />;
  }

  return (
    <div className="app-section">
      {groups.map(({ member, due }) => {
        const palette = paletteForMember(member, members);
        const done = due.filter((chore) => choreCompletedOn(completions, chore.id, today)).length;
        return (
          <section key={member.id} className="app-section">
            <div className="flex items-center gap-3">
              <MemberAvatar member={member} size="sm" />
              <h3 className="text-base font-semibold">{memberFirstName(member)}</h3>
              <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: palette.soft, color: palette.ink }}>
                {done}/{due.length}
              </span>
              {done === due.length ? <span className="pop-in text-xs font-semibold text-emerald-700 dark:text-emerald-300">All done ✨</span> : null}
            </div>
            <div className="grid-auto-fit-sm">
              {due.map((chore) => (
                <ChoreTile
                  key={chore.id}
                  chore={chore}
                  completed={Boolean(choreCompletedOn(completions, chore.id, today))}
                  disabled={!canToggle(chore)}
                  accent={palette.solid}
                  onToggle={() => onToggle(chore)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {unassigned.length > 0 ? (
        <section className="app-section">
          <div className="flex items-center gap-3">
            <MemberAvatar memberId={null} size="sm" />
            <h3 className="text-base font-semibold">Unassigned / family chores</h3>
            <span className="text-xs text-muted-foreground">Anyone can grab these</span>
          </div>
          <div className="grid-auto-fit-sm">
            {unassigned.map((chore) => {
              const completion = choreCompletedOn(completions, chore.id, today);
              const finisher = completion?.member_id ? members.find((member) => member.id === completion.member_id) : null;
              return (
                <div key={chore.id} className="relative">
                  <ChoreTile chore={chore} completed={Boolean(completion)} disabled={!canToggle(chore)} accent="#8A8A93" onToggle={() => onToggle(chore)} />
                  {finisher ? (
                    <span className="pointer-events-none absolute -top-2 right-3 flex items-center gap-1 rounded-full bg-card px-1.5 py-0.5 text-[11px] font-medium shadow-sm">
                      <MemberAvatar member={finisher} size="xs" /> {memberFirstName(finisher)}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
