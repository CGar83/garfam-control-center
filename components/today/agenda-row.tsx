"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, Check, CheckSquare, PartyPopper, Receipt, Stethoscope, Sunrise, Trophy, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MemberAvatarStack } from "@/components/app/member-avatar";
import { useFamilyMembers } from "@/hooks/use-family-members";
import type { AgendaItem, AgendaKind } from "@/lib/daily-brief";
import { paletteForMember } from "@/lib/member-colors";
import { cn } from "@/lib/utils";

const kindIcons: Record<AgendaKind, LucideIcon> = {
  event: CalendarDays,
  task: CheckSquare,
  bill: Receipt,
  appointment: Stethoscope,
  chore: Trophy,
  routine: Sunrise,
  meal: Utensils,
  milestone: PartyPopper,
  activity: PartyPopper
};

const kindLabels: Record<AgendaKind, string> = {
  event: "Event",
  task: "Task",
  bill: "Bill",
  appointment: "Appointment",
  chore: "Chore",
  routine: "Routine",
  meal: "Meal",
  milestone: "Big day",
  activity: "Activity"
};

interface AgendaRowProps {
  item: AgendaItem;
  onToggle?: (item: AgendaItem) => void;
  now?: Date;
  compact?: boolean;
}

export function AgendaRow({ item, onToggle, now, compact }: AgendaRowProps) {
  const { members, findMember } = useFamilyMembers();
  const primary = findMember(item.memberIds[0]);
  const palette = paletteForMember(primary, members);
  const Icon = kindIcons[item.kind];
  const toggleable = Boolean(onToggle) && (item.kind === "chore" || item.kind === "task");
  const isPast = Boolean(item.at && now && item.at.getTime() < now.getTime());
  const isNow = Boolean(item.at && now && Math.abs(item.at.getTime() - now.getTime()) < 30 * 60 * 1000);

  const body = (
    <>
      <div className="flex w-14 shrink-0 flex-col items-end pt-0.5 text-right">
        {item.at ? (
          <>
            <span className={cn("text-sm font-semibold tabular-nums", isPast && !isNow && "text-muted-foreground")}>{format(item.at, "h:mm")}</span>
            <span className="text-[10px] uppercase text-muted-foreground">{format(item.at, "a")}</span>
          </>
        ) : (
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{kindLabels[item.kind]}</span>
        )}
      </div>
      <div className="relative flex shrink-0 items-center self-stretch">
        <span className="h-full w-px bg-border" aria-hidden />
        <span
          className={cn("absolute left-1/2 top-2.5 h-3 w-3 -translate-x-1/2 rounded-full ring-4 ring-background", isNow && "animate-pulse")}
          style={{ backgroundColor: item.memberIds.length ? palette.solid : "hsl(var(--muted-foreground))" }}
          aria-hidden
        />
      </div>
      <div
        className={cn(
          "min-w-0 flex-1 rounded-2xl border border-border/70 bg-white/70 px-3 py-2.5 transition-all dark:bg-white/5",
          item.done && "opacity-60",
          isNow && "border-primary/50 shadow-[0_0_0_3px_rgba(240,112,90,0.12)]"
        )}
        style={item.memberIds.length ? { borderLeftColor: palette.solid, borderLeftWidth: 4 } : undefined}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base" style={{ backgroundColor: palette.soft, color: palette.ink }}>
            {item.emoji ? item.emoji : <Icon className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("text-wrap-safe text-sm font-semibold leading-snug", item.done && "line-through")}>{item.title}</p>
            {!compact && item.subtitle ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {item.memberIds.length ? <MemberAvatarStack memberIds={item.memberIds} size="xs" /> : null}
            {toggleable ? (
              <button
                type="button"
                aria-pressed={item.done}
                aria-label={item.done ? `Mark ${item.title} not done` : `Mark ${item.title} done`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggle?.(item);
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all active:scale-90 focus-ring",
                  item.done ? "border-transparent bg-emerald-500 text-white" : "border-border bg-white/80 text-transparent hover:border-emerald-400 dark:bg-white/10"
                )}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );

  if (toggleable) {
    return <div className="flex gap-3">{body}</div>;
  }

  return (
    <Link href={item.route} className="flex gap-3 rounded-2xl focus-ring">
      {body}
    </Link>
  );
}
