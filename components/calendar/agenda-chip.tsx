"use client";

import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, Check, ChevronRight } from "lucide-react";
import { MemberAvatarStack } from "@/components/app/member-avatar";
import type { AgendaItem } from "@/lib/daily-brief";
import { paletteForMember, type MemberPalette } from "@/lib/member-colors";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatItemTime, isCheckableKind, kindIcons, kindLabels } from "./helpers";

/** Palette for an agenda item, tinted by its first member (neutral when shared). */
export function itemPalette(item: AgendaItem, members: FamilyMember[]): MemberPalette {
  const first = item.memberIds[0];
  const member = first ? members.find((candidate) => candidate.id === first) ?? null : null;
  return paletteForMember(member, members);
}

export function tintStyle(palette: MemberPalette): CSSProperties {
  return { backgroundColor: palette.soft, color: palette.ink, borderLeftColor: palette.solid };
}

export function ConflictBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300",
        className
      )}
      title="Overlaps another event for the same person"
    >
      <AlertTriangle className="h-3 w-3" aria-hidden />
      Overlap
    </span>
  );
}

export function DoneDot({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        done ? "border-[#4CAF6E] bg-[#4CAF6E] text-white" : "border-border bg-transparent"
      )}
      aria-label={done ? "Done" : "Not done yet"}
      role="img"
    >
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
    </span>
  );
}

interface AgendaChipProps {
  item: AgendaItem;
  members: FamilyMember[];
  onClick: () => void;
  /** "chip" is a single tight line (month cells); "card" stacks time over title (week columns, day timeline). */
  layout?: "chip" | "card";
  showTime?: boolean;
  conflict?: boolean;
  className?: string;
}

/** Compact, member-tinted item used inside grid cells. */
export function AgendaChip({ item, members, onClick, layout = "chip", showTime = false, conflict = false, className }: AgendaChipProps) {
  const palette = itemPalette(item, members);
  const Icon = kindIcons[item.kind];
  const time = formatItemTime(item);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={`${item.title} · ${time}`}
      className={cn(
        "flex w-full min-w-0 border-l-[3px] text-left text-xs font-medium leading-tight transition-all hover:brightness-[0.97] active:scale-[0.98] focus-ring",
        layout === "chip" ? "items-center gap-1 rounded-md px-1.5 py-[3px]" : "flex-col gap-0.5 rounded-lg px-2 py-1.5",
        item.done && "opacity-60",
        className
      )}
      style={tintStyle(palette)}
    >
      {layout === "card" ? (
        <span className="flex w-full items-center gap-1 text-[11px] opacity-80">
          <span className="tabular-nums">{time}</span>
          {conflict ? <ConflictBadge className="ml-auto" /> : null}
        </span>
      ) : null}
      <span className="flex w-full min-w-0 items-center gap-1">
        {item.emoji ? (
          <span className="shrink-0 text-[11px] leading-none" aria-hidden>
            {item.emoji}
          </span>
        ) : (
          <Icon className="h-3 w-3 shrink-0 opacity-75" aria-hidden />
        )}
        {layout === "chip" && showTime && item.at ? <span className="shrink-0 tabular-nums opacity-75">{time}</span> : null}
        <span className={cn("min-w-0 flex-1 truncate", item.done && "line-through")}>{item.title}</span>
        {layout === "chip" && conflict ? <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Overlap" /> : null}
      </span>
    </button>
  );
}

interface AgendaRowProps {
  item: AgendaItem;
  members: FamilyMember[];
  onClick?: () => void;
  conflict?: boolean;
  hideTime?: boolean;
  trailing?: ReactNode;
}

/** Full-width list row for sheets, the agenda view, and the all-day strip. */
export function AgendaRow({ item, members, onClick, conflict = false, hideTime = false, trailing }: AgendaRowProps) {
  const palette = itemPalette(item, members);
  const Icon = kindIcons[item.kind];
  const interactive = Boolean(onClick);
  const Wrapper = interactive ? "button" : "div";

  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-2xl border border-border/70 border-l-[3px] bg-white/70 p-2.5 text-left transition-all dark:bg-white/5",
        interactive && "hover:border-primary/30 hover:bg-white active:scale-[0.99] focus-ring dark:hover:bg-white/10"
      )}
      style={{ borderLeftColor: palette.solid }}
    >
      {hideTime ? null : (
        <span className="w-14 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{item.at ? formatItemTime(item) : "All day"}</span>
      )}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
        style={{ backgroundColor: palette.soft, color: palette.ink }}
        aria-hidden
      >
        {item.emoji ? item.emoji : <Icon className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm font-medium", item.done && "text-muted-foreground line-through")}>{item.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {kindLabels[item.kind]}
          {item.subtitle ? ` · ${item.subtitle}` : ""}
        </span>
      </span>
      {conflict ? <ConflictBadge className="hidden sm:inline-flex" /> : null}
      {item.memberIds.length ? <MemberAvatarStack memberIds={item.memberIds} size="xs" max={3} /> : null}
      {isCheckableKind(item.kind) ? <DoneDot done={item.done} /> : null}
      {trailing}
      {interactive ? <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 sm:block" aria-hidden /> : null}
    </Wrapper>
  );
}
