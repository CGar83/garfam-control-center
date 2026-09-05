"use client";

import Link from "next/link";
import { format, isToday, parseISO } from "date-fns";
import { ArrowRight, CalendarPlus, Heart } from "lucide-react";
import { MemberAvatar, MemberAvatarStack } from "@/components/app/member-avatar";
import { PrivacyMask } from "@/components/app/privacy-mask";
import { ProgressRing } from "@/components/app/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { firstName, paletteForMember } from "@/lib/member-colors";
import type { Bill, WeeklyReview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMoney, type DayAgenda, type DinnerSlot, type KidChoreSummary, type WinsStats } from "@/components/planning/helpers";
import { ReviewTextField } from "@/components/planning/review-text-field";

type SaveField = (field: "wins" | "focus" | "worries" | "date_night_plan", value: string) => Promise<void>;

function StatPill({ value, label, emoji }: { value: number; label: string; emoji: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2.5">
      <span className="text-xl" aria-hidden>
        {emoji}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function WinsStep({ stats, review, onSave }: { stats: WinsStats; review: WeeklyReview | null; onSave: SaveField }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <StatPill value={stats.choresDone} label="chores done" emoji="🧹" />
        <StatPill value={stats.tasksDone} label="tasks finished" emoji="✅" />
        <StatPill value={stats.memoriesAdded} label="memories saved" emoji="✨" />
      </div>
      <ReviewTextField id="review-wins" label="Our wins" value={review?.wins ?? ""} placeholder="Made every pickup. Chili night was a hit. Nobody cried at bedtime (twice)." onSave={(value) => onSave("wins", value)} />
    </div>
  );
}

export function CalendarStep({ agenda, onAddEvent }: { agenda: DayAgenda[]; onAddEvent: () => void }) {
  const total = agenda.reduce((sum, day) => sum + day.items.length, 0);
  return (
    <div className="flex flex-col gap-3">
      {total === 0 ? (
        <p className="rounded-2xl bg-muted/50 px-4 py-5 text-center text-sm text-muted-foreground">A quiet week on the calendar. Add what you know is coming.</p>
      ) : (
        <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70">
          {agenda.map(({ day, items }) => (
            <li key={day.toISOString()} className={cn("flex gap-3 p-3", items.length === 0 && "opacity-60")}>
              <div className={cn("flex w-11 shrink-0 flex-col items-center rounded-xl py-1.5 text-center", isToday(day) ? "bg-primary text-primary-foreground" : "bg-muted")}>
                <span className="text-[10px] font-semibold uppercase leading-none">{format(day, "EEE")}</span>
                <span className="mt-1 text-base font-bold leading-none">{format(day, "d")}</span>
              </div>
              <div className="min-w-0 flex-1">
                {items.length === 0 ? (
                  <p className="pt-2 text-xs text-muted-foreground">Nothing scheduled</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {items.map((item) => (
                      <li key={`${item.kind}-${item.id}`} className="flex items-center gap-2 text-sm">
                        <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{item.at ? format(item.at, "h:mm a") : "All day"}</span>
                        <span className="text-wrap-safe min-w-0 flex-1 truncate font-medium">
                          {item.emoji ? `${item.emoji} ` : ""}
                          {item.title}
                        </span>
                        {item.kind !== "event" ? (
                          <Badge variant="outline" className="hidden capitalize sm:inline-flex">
                            {item.kind}
                          </Badge>
                        ) : null}
                        {item.memberIds.length > 0 ? <MemberAvatarStack memberIds={item.memberIds} size="xs" max={3} /> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onAddEvent}>
          <CalendarPlus className="h-4 w-4" />
          Add event
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/calendar">
            Open calendar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function MealsStep({ slots }: { slots: DinnerSlot[] }) {
  const open = slots.filter((slot) => !slot.title).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{open === 0 ? "Every dinner is planned. Look at you." : `${open} open ${open === 1 ? "night" : "nights"} to fill`}</p>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/meals">
            Plan meals
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {slots.map(({ day, title }) => (
          <li key={day.toISOString()} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2 text-sm", title ? "border-border/70 bg-white/60 dark:bg-white/5" : "border-dashed border-amber-300/80 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20")}>
            <span className="w-9 shrink-0 text-xs font-semibold uppercase text-muted-foreground">{format(day, "EEE")}</span>
            <span className={cn("text-wrap-safe min-w-0 flex-1 truncate", title ? "font-medium" : "italic text-muted-foreground")}>{title ?? "open"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChoresStep({ summaries }: { summaries: KidChoreSummary[] }) {
  const { members } = useFamilyMembers();
  return (
    <div className="flex flex-col gap-3">
      {summaries.length === 0 ? (
        <p className="rounded-2xl bg-muted/50 px-4 py-5 text-center text-sm text-muted-foreground">No kids with chores yet. Set some up and this fills in.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {summaries.map(({ member, due, done, percent, points }) => {
            const palette = paletteForMember(member, members);
            return (
              <li key={member.id} className="flex items-center gap-3 rounded-2xl border-l-4 bg-white/60 p-3 dark:bg-white/5" style={{ borderLeftColor: palette.solid }}>
                <ProgressRing value={due === 0 ? 0 : percent} size={52} stroke={6} color={palette.solid} label={`${firstName(member.display_name)} ${percent}% of chores`}>
                  <MemberAvatar member={member} size="sm" />
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{firstName(member.display_name)}</p>
                  <p className="text-xs text-muted-foreground">
                    {due === 0 ? "Nothing was due" : `${done} of ${due} chores · ${points} pts`}
                  </p>
                </div>
                {due > 0 && percent === 100 ? (
                  <Badge variant="success" className="shrink-0">
                    Perfect week
                  </Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/chores">
          Adjust chores
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export function MoneyStep({ bills, total }: { bills: Bill[]; total: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3 rounded-2xl bg-muted/60 p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Due this week</p>
          <p className="mt-1 text-2xl font-bold leading-none">
            <PrivacyMask value={formatMoney(total)} sensitive>
              {formatMoney(total)}
            </PrivacyMask>
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {bills.length} {bills.length === 1 ? "bill" : "bills"}
        </p>
      </div>
      {bills.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {bills.map((bill) => (
            <li key={bill.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{bill.name}</p>
                <p className="text-xs text-muted-foreground">
                  {bill.due_date ? format(parseISO(bill.due_date), "EEE, MMM d") : "No date"}
                  {bill.autopay ? " · Autopay" : ""}
                </p>
              </div>
              <span className="shrink-0 font-semibold">
                <PrivacyMask value={formatMoney(bill.amount)} sensitive>
                  {formatMoney(bill.amount)}
                </PrivacyMask>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing due this week. Enjoy it.</p>
      )}
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/bills">
          Open bills
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export function ConnectionStep({ review, onSave, onScheduleDateNight }: { review: WeeklyReview | null; onSave: SaveField; onScheduleDateNight: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <ReviewTextField id="review-date-night" label="Date night plan" value={review?.date_night_plan ?? ""} placeholder="Taco place, Friday 7pm. Sitter booked?" multiline={false} onSave={(value) => onSave("date_night_plan", value)} />
        </div>
        <Button variant="outline" className="h-11 shrink-0" onClick={onScheduleDateNight}>
          <Heart className="h-4 w-4 text-primary" />
          Schedule date night
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewTextField id="review-worries" label="What I'm worried about" value={review?.worries ?? ""} placeholder="One each. Listener reflects it back before responding." onSave={(value) => onSave("worries", value)} />
        <ReviewTextField id="review-focus" label="Focus for the week" value={review?.focus ?? ""} placeholder="Protect Thursday evening. Bedtime by 8:30." onSave={(value) => onSave("focus", value)} />
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Close with one appreciation each. Small, specific, out loud.</p>
    </div>
  );
}
