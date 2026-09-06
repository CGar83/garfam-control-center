"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDays, format, formatDistanceToNowStrict, isSameDay, parseISO, startOfDay } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  Check,
  Flame,
  HeartHandshake,
  MessageSquareText,
  PartyPopper,
  Plus,
  ShoppingCart,
  Sparkles,
  Trophy,
  Utensils
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/app/member-avatar";
import { ProgressRing } from "@/components/app/progress-ring";
import { useAppData } from "@/components/app/providers";
import { QuickAddSheet } from "@/components/app/quick-add-sheet";
import { AgendaRow } from "@/components/today/agenda-row";
import { MoodPicker, moodFaces } from "@/components/today/mood-picker";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useToast } from "@/hooks/use-toast";
import { memberCanAccessPath } from "@/lib/access-control";
import { agendaForMember, buildAgenda, buildNudges, greetingFor, type AgendaItem, type Nudge } from "@/lib/daily-brief";
import { isChildMember } from "@/lib/family-members";
import { firstName, paletteForMember } from "@/lib/member-colors";
import {
  choreProgressForDay,
  choreStreak,
  dateKey,
  daysUntil,
  nextOccurrence,
  pointsBalance,
  routineCompletionFor,
  routineIsComplete,
  routineRunsOn,
  yearsAtNextOccurrence
} from "@/lib/streaks";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";

const nudgeTones: Record<Nudge["tone"], string> = {
  warm: "border-[#ACE1AF]/70 bg-[#ACE1AF]/25 text-[#235226] dark:border-[#ACE1AF]/30 dark:bg-[#ACE1AF]/10 dark:text-[#D7F2D9]",
  attention: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100",
  celebrate: "border-primary/30 bg-primary/10 text-foreground"
};

function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function MemberDayCard({
  member,
  agenda,
  selected,
  onSelect,
  today
}: {
  member: FamilyMember;
  agenda: AgendaItem[];
  selected: boolean;
  onSelect: () => void;
  today: Date;
}) {
  const { data } = useAppData();
  const { members } = useFamilyMembers();
  const palette = paletteForMember(member, members);
  const mine = agenda.filter((item) => item.memberIds.includes(member.id));
  const remaining = mine.filter((item) => !item.done).length;
  const chores = choreProgressForDay(data.chores, data.chore_completions, member.id, today);
  const routines = data.routines.filter((routine) => routine.member_id === member.id && routineRunsOn(routine, today));
  const routinesDone = routines.filter((routine) => routineIsComplete(routine, routineCompletionFor(data.routine_completions, routine.id, today))).length;
  const totalTodo = chores.due.length + routines.length;
  const totalDone = chores.done.length + routinesDone;
  const percent = totalTodo === 0 ? (mine.length ? 100 : 0) : Math.round((totalDone / totalTodo) * 100);
  const streak = isChildMember(member) ? choreStreak(data.chores, data.chore_completions, member.id, today) : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex min-w-[9.5rem] flex-1 items-center gap-3 rounded-[1.25rem] border p-3 text-left transition-all active:scale-[0.98] focus-ring",
        selected ? "shadow-[var(--shadow-elevated)]" : "border-border/70 bg-white/70 hover:border-foreground/20 dark:bg-white/5"
      )}
      style={selected ? { backgroundColor: palette.soft, borderColor: palette.border } : undefined}
    >
      <ProgressRing value={percent} size={52} stroke={5} color={palette.solid} label={`${firstName(member.display_name)} ${percent}% done`}>
        <MemberAvatar member={member} size="md" />
      </ProgressRing>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold" style={selected ? { color: palette.ink } : undefined}>
          {firstName(member.display_name)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {mine.length === 0 ? "Free day" : remaining === 0 ? "All done" : `${remaining} to go`}
        </p>
        {streak > 1 ? (
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            <Flame className="h-3 w-3" />
            {streak}-day streak
          </p>
        ) : null}
      </div>
    </button>
  );
}

export default function TodayPage() {
  const now = useMinuteClock();
  const today = useMemo(() => startOfDay(now), [now]);
  const { data, currentMember, currentMemberId, createRecord, updateRecord, deleteRecord } = useAppData();
  const { members, parents } = useFamilyMembers();
  const { toast } = useToast();
  const isKid = Boolean(currentMember && isChildMember(currentMember));
  const canFinances = memberCanAccessPath(currentMember, "/finances");
  const canRelationship = memberCanAccessPath(currentMember, "/relationship");
  const canCommunication = memberCanAccessPath(currentMember, "/communication");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(() => (isKid ? currentMemberId : null));
  const [quickOpen, setQuickOpen] = useState(false);
  const [savingMood, setSavingMood] = useState(false);

  useEffect(() => {
    if (isKid && currentMemberId) setSelectedMemberId(currentMemberId);
  }, [currentMemberId, isKid]);

  const fullAgenda = useMemo(() => buildAgenda(data, today, { includeSensitive: canFinances }), [canFinances, data, today]);
  const agenda = useMemo(() => agendaForMember(fullAgenda, selectedMemberId), [fullAgenda, selectedMemberId]);
  const tomorrow = useMemo(() => agendaForMember(buildAgenda(data, addDays(today, 1), { includeSensitive: canFinances }), selectedMemberId).filter((item) => item.kind !== "chore" && item.kind !== "routine"), [canFinances, data, selectedMemberId, today]);
  const nudges = useMemo(() => buildNudges(data, currentMember, members, now), [currentMember, data, members, now]);

  const timed = agenda.filter((item) => item.at);
  const allDay = agenda.filter((item) => !item.at);
  const remainingCount = agenda.filter((item) => !item.done).length;
  const nextUp = timed.find((item) => item.at && item.at.getTime() >= now.getTime());

  const todayKey = dateKey(today);
  const dinner = data.meal_plans.find((meal) => meal.meal_date === todayKey && meal.meal_type === "Dinner");
  const dinnerRecipe = dinner?.recipe_id ? data.recipes.find((recipe) => recipe.id === dinner.recipe_id) : null;
  const openGrocery = data.grocery_items.filter((item) => !item.checked);
  const kids = members.filter(isChildMember);
  const countdowns = useMemo(
    () =>
      data.milestones
        .map((milestone) => ({ milestone, days: daysUntil(milestone.date, milestone.recurring_yearly, today) }))
        .filter(({ days }) => days >= 0 && days <= 120)
        .sort((a, b) => a.days - b.days)
        .slice(0, 3),
    [data.milestones, today]
  );
  const myCheckin = currentMemberId ? data.checkins.find((checkin) => checkin.member_id === currentMemberId && checkin.checkin_date === todayKey) ?? null : null;
  const partner = parents.find((parent) => parent.id !== currentMemberId) ?? null;
  const partnerCheckin = partner ? data.checkins.find((checkin) => checkin.member_id === partner.id && checkin.checkin_date === todayKey && checkin.shared_with_partner) ?? null : null;
  const pinnedNotes = data.communication_notes.filter((note) => note.pinned).slice(0, 2);
  const recentMemory = [...data.journal_entries].sort((a, b) => parseISO(b.entry_date).getTime() - parseISO(a.entry_date).getTime())[0];

  async function toggleItem(item: AgendaItem) {
    try {
      if (item.kind === "chore") {
        const existing = data.chore_completions.find((completion) => completion.chore_id === item.id && completion.completed_on === todayKey);
        if (existing) {
          await deleteRecord("chore_completions", existing.id);
          return;
        }
        const chore = data.chores.find((record) => record.id === item.id);
        if (!chore) return;
        await createRecord("chore_completions", {
          chore_id: chore.id,
          member_id: chore.assigned_to ?? currentMemberId,
          completed_on: todayKey,
          points_awarded: chore.points,
          approved_by: isKid ? null : currentMemberId
        });
        toast({ title: `${chore.emoji ?? "✅"} ${chore.title} done`, description: chore.points ? `+${chore.points} points` : undefined, variant: "success" });
      } else if (item.kind === "task") {
        const task = data.tasks.find((record) => record.id === item.id);
        if (!task) return;
        const done = task.status !== "done";
        await updateRecord("tasks", task.id, { status: done ? "done" : "not_started", completed_at: done ? new Date().toISOString() : null });
        if (done) toast({ title: "Task complete", description: task.title, variant: "success" });
      }
    } catch (error) {
      toast({ title: "Could not update", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  }

  async function saveMood(mood: number) {
    if (!currentMemberId || savingMood) return;
    setSavingMood(true);
    try {
      if (myCheckin) {
        await updateRecord("checkins", myCheckin.id, { mood });
      } else {
        await createRecord("checkins", {
          member_id: currentMemberId,
          checkin_date: todayKey,
          mood,
          energy: 3,
          gratitude: null,
          needs: null,
          note: null,
          shared_with_partner: true
        });
      }
      toast({ title: "Checked in", description: "Add a gratitude or a need on the Check-in page when you have a minute.", variant: "success" });
    } finally {
      setSavingMood(false);
    }
  }

  const greeting = greetingFor(now, firstName(currentMember?.display_name));
  const summaryBits = [
    `${fullAgenda.filter((item) => item.kind === "event" || item.kind === "appointment").length} on the calendar`,
    `${fullAgenda.filter((item) => item.kind === "chore" && !item.done).length} chores left`,
    dinner ? `dinner: ${dinner.title}` : "dinner still open"
  ];

  return (
    <div className="app-page">
      <section className="hero-card fade-up p-5 sm:p-7">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80">{format(now, "EEEE, MMMM d")}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{greeting}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
              {remainingCount === 0 && agenda.length > 0
                ? "Everything for today is handled. Enjoy it."
                : summaryBits.join(" · ")}
            </p>
            {nextUp?.at ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-sm font-medium backdrop-blur">
                <CalendarDays className="h-4 w-4" />
                Next: {nextUp.title} at {format(nextUp.at, "h:mm a")}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="secondary" className="bg-white text-neutral-900 hover:bg-white/90" onClick={() => setQuickOpen(true)}>
              <Plus className="h-4 w-4" />
              Quick add
            </Button>
            <Button asChild variant="ghost" className="text-white hover:bg-white/15 hover:text-white">
              <Link href="/calendar">
                Open calendar
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="fade-up fade-up-delay-1" aria-label="Family members">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedMemberId(null)}
            aria-pressed={selectedMemberId === null}
            className={cn(
              "flex min-w-[7.5rem] flex-col items-start justify-center rounded-[1.25rem] border p-3 text-left transition-all active:scale-[0.98] focus-ring",
              selectedMemberId === null ? "border-foreground bg-foreground text-background shadow-[var(--shadow-elevated)]" : "border-border/70 bg-white/70 hover:border-foreground/20 dark:bg-white/5"
            )}
          >
            <span className="text-sm font-semibold">Everyone</span>
            <span className={cn("text-xs", selectedMemberId === null ? "text-background/70" : "text-muted-foreground")}>{fullAgenda.length} today</span>
          </button>
          {members.map((member) => (
            <MemberDayCard
              key={member.id}
              member={member}
              agenda={fullAgenda}
              today={today}
              selected={selectedMemberId === member.id}
              onSelect={() => setSelectedMemberId((current) => (current === member.id ? null : member.id))}
            />
          ))}
        </div>
      </section>

      {nudges.length ? (
        <section className="fade-up fade-up-delay-2 no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1" aria-label="Suggestions">
          {nudges.map((nudge) => (
            <Link
              key={nudge.id}
              href={nudge.route}
              className={cn("flex min-w-[15rem] max-w-xs flex-1 items-start gap-3 rounded-2xl border p-3.5 transition-all hover:-translate-y-0.5 focus-ring", nudgeTones[nudge.tone])}
            >
              <span className="text-2xl leading-none">{nudge.emoji}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-snug">{nudge.title}</span>
                <span className="mt-0.5 block text-xs opacity-80">{nudge.body}</span>
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <Card className="fade-up fade-up-delay-2 min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-lg">Today&apos;s plan</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {selectedMemberId ? `${firstName(members.find((member) => member.id === selectedMemberId)?.display_name)}'s day` : "Whole family"} · {remainingCount} remaining
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/calendar">Week view</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {agenda.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-center">
                <p className="text-sm font-medium">Nothing scheduled. A rare open day.</p>
                <p className="mt-1 text-xs text-muted-foreground">Add something, or protect the space.</p>
                <Button size="sm" className="mt-3" onClick={() => setQuickOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add to today
                </Button>
              </div>
            ) : null}
            {timed.length ? (
              <div className="space-y-2">
                {timed.map((item) => (
                  <AgendaRow key={`${item.kind}-${item.id}`} item={item} now={now} onToggle={toggleItem} />
                ))}
              </div>
            ) : null}
            {allDay.length ? (
              <div className="space-y-2">
                {timed.length ? <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anytime today</p> : null}
                {allDay.map((item) => (
                  <AgendaRow key={`${item.kind}-${item.id}`} item={item} now={now} onToggle={toggleItem} compact />
                ))}
              </div>
            ) : null}
            {tomorrow.length ? (
              <div className="mt-4 rounded-2xl bg-muted/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tomorrow at a glance</p>
                <ul className="mt-2 space-y-1.5">
                  {tomorrow.slice(0, 4).map((item) => (
                    <li key={`${item.kind}-${item.id}`} className="flex items-center gap-2 text-sm">
                      <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">{item.at ? format(item.at, "h:mm a") : "All day"}</span>
                      <span className="truncate">{item.emoji ? `${item.emoji} ` : ""}{item.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="app-section">
          <Card className="fade-up fade-up-delay-3">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Utensils className="h-4 w-4 text-primary" />
                Tonight
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/meals">Meal plan</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {dinner ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">{dinnerRecipe?.emoji ?? "🍽️"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{dinner.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {dinner.cook_id ? `${firstName(members.find((member) => member.id === dinner.cook_id)?.display_name)} is cooking` : "No cook assigned"}
                      {dinnerRecipe?.prep_minutes || dinnerRecipe?.cook_minutes ? ` · ${(dinnerRecipe.prep_minutes ?? 0) + (dinnerRecipe.cook_minutes ?? 0)} min` : ""}
                    </p>
                  </div>
                  {dinner.cook_id ? <MemberAvatar memberId={dinner.cook_id} size="sm" /> : null}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Dinner is still open.</p>
                  <Button asChild size="sm">
                    <Link href="/meals">
                      <ChefHat className="h-4 w-4" />
                      Plan it
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="fade-up fade-up-delay-3">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4 text-primary" />
                Grocery
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{openGrocery.length}</span>
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/grocery">Open list</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {openGrocery.length === 0 ? (
                <p className="text-sm text-muted-foreground">List is clear. Add items with quick add.</p>
              ) : (
                <ul className="space-y-1">
                  {openGrocery.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => updateRecord("grocery_items", item.id, { checked: true })}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-muted focus-ring"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-border text-transparent transition-colors hover:border-emerald-400">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.store ?? item.category}</span>
                      </button>
                    </li>
                  ))}
                  {openGrocery.length > 5 ? <li className="px-2 pt-1 text-xs text-muted-foreground">+{openGrocery.length - 5} more</li> : null}
                </ul>
              )}
            </CardContent>
          </Card>

          {kids.length ? (
            <Card className="fade-up fade-up-delay-4">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-primary" />
                  Points
                </CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/chores">Chores</Link>
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {kids.map((kid) => {
                  const palette = paletteForMember(kid, members);
                  const progress = choreProgressForDay(data.chores, data.chore_completions, kid.id, today);
                  return (
                    <div key={kid.id} className="rounded-2xl p-3" style={{ backgroundColor: palette.soft, color: palette.ink }}>
                      <div className="flex items-center gap-2">
                        <MemberAvatar member={kid} size="sm" />
                        <span className="truncate text-sm font-semibold">{firstName(kid.display_name)}</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold tabular-nums">{pointsBalance(data.chore_completions, data.reward_claims, kid.id)}</p>
                      <p className="text-xs opacity-80">
                        {progress.due.length ? `${progress.done.length}/${progress.due.length} chores today` : "No chores today"}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="grid-auto-fit-lg">
        {canRelationship && currentMember && !isKid ? (
          <Card className="fade-up fade-up-delay-4">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <HeartHandshake className="h-4 w-4 text-primary" />
                Check-in
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/checkin">Details</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{myCheckin ? "Logged. Tap to change." : "How is today going?"}</p>
              <MoodPicker value={myCheckin?.mood ?? null} onChange={saveMood} size="sm" disabled={savingMood} />
              {partner ? (
                <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
                  <MemberAvatar member={partner} size="md" />
                  <div className="min-w-0 flex-1 text-sm">
                    {partnerCheckin ? (
                      <>
                        <p className="font-medium">
                          {firstName(partner.display_name)} is feeling {moodFaces[partnerCheckin.mood - 1]}
                        </p>
                        {partnerCheckin.needs ? <p className="truncate text-xs text-muted-foreground">Needs: {partnerCheckin.needs}</p> : null}
                      </>
                    ) : (
                      <p className="text-muted-foreground">{firstName(partner.display_name)} has not checked in yet today.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className="fade-up fade-up-delay-4">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PartyPopper className="h-4 w-4 text-primary" />
              Coming up
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/memories">All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {countdowns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No countdowns yet. Add a birthday or a trip.</p>
            ) : (
              <ul className="space-y-2">
                {countdowns.map(({ milestone, days }) => (
                  <li key={milestone.id} className="flex items-center gap-3 rounded-2xl border border-border/70 p-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">{milestone.emoji ?? "⭐"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {milestone.title}
                        {milestone.kind === "birthday" && milestone.member_id ? ` · turning ${yearsAtNextOccurrence(milestone.date, today)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{format(nextOccurrence(milestone.date, milestone.recurring_yearly, today), "EEE, MMM d")}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", days === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="fade-up fade-up-delay-4">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              {canCommunication && pinnedNotes.length ? "Pinned notes" : "Latest memory"}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={canCommunication && pinnedNotes.length ? "/communication" : "/memories"}>{canCommunication && pinnedNotes.length ? "Board" : "Memories"}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {canCommunication && pinnedNotes.length ? (
              pinnedNotes.map((note) => (
                <div key={note.id} className="rounded-2xl border border-border/70 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquareText className="h-3.5 w-3.5 text-primary" />
                    {note.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note.message}</p>
                </div>
              ))
            ) : recentMemory ? (
              <div className="rounded-2xl border border-border/70 p-3">
                <p className="text-sm font-semibold">{recentMemory.title}</p>
                {recentMemory.body ? <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{recentMemory.body}</p> : null}
                <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {formatDistanceToNowStrict(parseISO(recentMemory.entry_date), { addSuffix: true })}
                  {isSameDay(parseISO(recentMemory.entry_date), today) ? " · today" : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Save one small moment from today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <QuickAddSheet open={quickOpen} onOpenChange={setQuickOpen} />
    </div>
  );
}
