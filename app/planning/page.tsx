"use client";

import { useMemo, useRef, useState } from "react";
import { addDays, format, getDay, parseISO, subDays } from "date-fns";
import { CalendarCheck, ChevronLeft, ChevronRight, PartyPopper, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { MemberAvatarStack } from "@/components/app/member-avatar";
import { PageHeader } from "@/components/app/page-header";
import { useAppData } from "@/components/app/providers";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import {
  billsDueInWeek,
  defaultWeekStart,
  dinnerSlots,
  excerpt,
  findReview,
  kidChoreSummaries,
  previousWeekDays,
  stepMeta,
  weekAgenda,
  weekDays,
  weekLabel,
  weekRelativeLabel,
  winsStats,
  type StepKey
} from "@/components/planning/helpers";
import { StepCard } from "@/components/planning/step-card";
import { CalendarStep, ChoresStep, ConnectionStep, MealsStep, MoneyStep, WinsStep } from "@/components/planning/steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { useToast } from "@/hooks/use-toast";
import { memberCanAccessPath } from "@/lib/access-control";
import { moduleConfigs } from "@/lib/modules";
import { dateKey } from "@/lib/streaks";
import type { WeeklyReview } from "@/lib/types";
import { cn, nowIso } from "@/lib/utils";

const dateNightDefaults = { title: "Date night", category: "Family" };
const eventDefaults = { category: "Family" };
const stepsRequired = 4;

export default function PlanningPage() {
  const { data, createRecord, updateRecord, currentMember, currentMemberId } = useAppData();
  const { children } = useFamilyMembers();
  const { toast } = useToast();
  const reviews = useRealtimeTable("weekly_reviews") as WeeklyReview[];

  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState(() => defaultWeekStart(today));
  const [calendarDialog, setCalendarDialog] = useState<{ open: boolean; overrides: Record<string, unknown> }>({ open: false, overrides: eventDefaults });
  const createdReviews = useRef<Record<string, WeeklyReview>>({});
  const pendingCreate = useRef<Promise<WeeklyReview> | null>(null);

  const isParent = !currentMember || currentMember.role !== "viewer";
  const weekKey = dateKey(weekStart);
  const review = findReview(reviews, weekStart) ?? createdReviews.current[weekKey] ?? null;
  const canSeeMoney = memberCanAccessPath(currentMember, "/finances");
  const canSeeHealth = memberCanAccessPath(currentMember, "/health");
  const steps = useMemo(() => stepMeta.filter((step) => step.key !== "money" || canSeeMoney), [canSeeMoney]);
  const completed = useMemo(() => new Set((review?.completed_steps ?? []).filter((key) => steps.some((step) => step.key === key))), [review, steps]);
  const doneCount = completed.size;
  const isWeekend = getDay(today) === 0 || getDay(today) === 6;

  const upcoming = useMemo(() => weekDays(weekStart), [weekStart]);
  const past = useMemo(() => previousWeekDays(weekStart), [weekStart]);
  const wins = useMemo(() => winsStats(data, past), [data, past]);
  const agenda = useMemo(() => weekAgenda(data, upcoming, canSeeHealth), [data, upcoming, canSeeHealth]);
  const dinners = useMemo(() => dinnerSlots(data, upcoming), [data, upcoming]);
  const kidChores = useMemo(() => kidChoreSummaries(data, children, past), [data, children, past]);
  const bills = useMemo(() => billsDueInWeek(data.bills, upcoming), [data.bills, upcoming]);
  const pastReviews = useMemo(
    () => [...reviews].filter((item) => item.week_start !== weekKey).sort((a, b) => b.week_start.localeCompare(a.week_start)).slice(0, 8),
    [reviews, weekKey]
  );

  async function ensureReview(): Promise<WeeklyReview> {
    const existing = findReview(reviews, weekStart) ?? createdReviews.current[weekKey];
    if (existing) return existing;
    if (!pendingCreate.current) {
      pendingCreate.current = createRecord("weekly_reviews", {
        week_start: weekKey,
        completed_steps: [],
        wins: null,
        focus: null,
        worries: null,
        date_night_plan: null,
        completed_at: null,
        reviewed_by: []
      })
        .then((record) => {
          createdReviews.current[weekKey] = record;
          return record;
        })
        .finally(() => {
          pendingCreate.current = null;
        });
    }
    return pendingCreate.current;
  }

  function fail(error: unknown) {
    toast({ title: "Could not save", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
  }

  async function toggleStep(key: StepKey) {
    try {
      const target = await ensureReview();
      const latest = findReview(reviews, weekStart) ?? target;
      const current = latest.completed_steps ?? [];
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      const updated = await updateRecord("weekly_reviews", target.id, { completed_steps: next });
      createdReviews.current[weekKey] = updated;
      if (!current.includes(key) && next.length === steps.length) {
        toast({ title: "Every step done", description: "Hit Complete review to close it out.", variant: "success" });
      }
    } catch (error) {
      fail(error);
    }
  }

  async function saveField(field: "wins" | "focus" | "worries" | "date_night_plan", value: string) {
    try {
      const target = await ensureReview();
      const updated = await updateRecord("weekly_reviews", target.id, { [field]: value || null });
      createdReviews.current[weekKey] = updated;
    } catch (error) {
      fail(error);
    }
  }

  async function completeReview() {
    try {
      const target = await ensureReview();
      const latest = findReview(reviews, weekStart) ?? target;
      const reviewedBy = new Set(latest.reviewed_by ?? []);
      if (currentMemberId) reviewedBy.add(currentMemberId);
      const updated = await updateRecord("weekly_reviews", target.id, { completed_at: latest.completed_at ?? nowIso(), reviewed_by: [...reviewedBy] });
      createdReviews.current[weekKey] = updated;
      toast({ title: latest.completed_at ? "Added you to this review" : "Week planned", description: "Go enjoy the rest of your evening.", variant: "success" });
    } catch (error) {
      fail(error);
    }
  }

  if (!isParent) {
    return (
      <div className="app-page">
        <PageHeader title="Weekly Plan" description="The Sunday reset." />
        <EmptyState title="This one is for the grown-ups" description="The weekly plan is where parents line up the week ahead." />
      </div>
    );
  }

  const isComplete = Boolean(review?.completed_at);
  const alreadyReviewed = Boolean(currentMemberId && review?.reviewed_by?.includes(currentMemberId));
  const progressPercent = steps.length === 0 ? 0 : Math.round((doneCount / steps.length) * 100);

  return (
    <div className="app-page">
      <PageHeader
        title="Weekly Plan"
        description="A Sunday reset, together. Wins first, then the week ahead, then us."
        action={
          <div className="flex items-center gap-1 rounded-full border border-border bg-white/70 p-1 dark:bg-white/5">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Previous week" onClick={() => setWeekStart((current) => subDays(current, 7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button type="button" className="min-w-[8.5rem] px-2 text-center text-sm font-semibold focus-ring" onClick={() => setWeekStart(defaultWeekStart(today))} aria-label="Jump to this week">
              <span className="block leading-tight">{weekLabel(weekStart)}</span>
              <span className="block text-[11px] font-medium text-muted-foreground">{weekRelativeLabel(weekStart, today)}</span>
            </button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Next week" onClick={() => setWeekStart((current) => addDays(current, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {isComplete ? (
        <section className="hero-card fade-up p-5 sm:p-6">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="pop-in flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <PartyPopper className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-semibold leading-tight sm:text-2xl">Week of {format(weekStart, "MMM d")} is planned</h2>
                <p className="mt-1 text-sm text-white/85">
                  Reviewed {review?.completed_at ? format(parseISO(review.completed_at), "EEE, MMM d 'at' h:mm a") : ""}
                  {review?.reviewed_by?.length ? " together" : ""}. You can still tweak anything below.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {review?.reviewed_by?.length ? <MemberAvatarStack memberIds={review.reviewed_by} size="md" /> : null}
              {!alreadyReviewed ? (
                <Button variant="secondary" size="sm" className="bg-white/90 text-neutral-900 hover:bg-white" onClick={() => void completeReview()}>
                  I reviewed it too
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <Card className="fade-up">
          <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CalendarCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-semibold leading-tight">
                    {doneCount} of {steps.length} steps
                  </p>
                  <p className="text-xs text-muted-foreground">{doneCount === 0 ? "Start anywhere. Wins is a good place." : doneCount >= stepsRequired ? "Enough to call it a plan." : `${stepsRequired - doneCount} more to complete the review`}</p>
                </div>
              </div>
              <Button disabled={doneCount < stepsRequired} onClick={() => void completeReview()} className="h-11">
                <Sparkles className="h-4 w-4" />
                Complete review
              </Button>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length} aria-label="Review progress">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            {!isWeekend ? (
              <p className="text-xs text-muted-foreground">
                <span className="mr-1" aria-hidden>
                  🕯️
                </span>
                Best done Sunday evening together, but any day you both have twenty minutes works.
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <section className="flex flex-col gap-4">
        {steps.map((meta, index) => {
          const done = completed.has(meta.key);
          const toggle = () => void toggleStep(meta.key);
          switch (meta.key) {
            case "wins":
              return (
                <StepCard key={meta.key} meta={meta} index={index} done={done} onToggle={toggle}>
                  <WinsStep stats={wins} review={review} onSave={saveField} />
                </StepCard>
              );
            case "calendar":
              return (
                <StepCard key={meta.key} meta={meta} index={index} done={done} onToggle={toggle}>
                  <CalendarStep agenda={agenda} onAddEvent={() => setCalendarDialog({ open: true, overrides: eventDefaults })} />
                </StepCard>
              );
            case "meals":
              return (
                <StepCard key={meta.key} meta={meta} index={index} done={done} onToggle={toggle}>
                  <MealsStep slots={dinners} />
                </StepCard>
              );
            case "chores":
              return (
                <StepCard key={meta.key} meta={meta} index={index} done={done} onToggle={toggle}>
                  <ChoresStep summaries={kidChores} />
                </StepCard>
              );
            case "money":
              return (
                <StepCard key={meta.key} meta={meta} index={index} done={done} onToggle={toggle}>
                  <MoneyStep bills={bills.bills} total={bills.total} />
                </StepCard>
              );
            case "connection":
              return (
                <StepCard key={meta.key} meta={meta} index={index} done={done} onToggle={toggle}>
                  <ConnectionStep review={review} onSave={saveField} onScheduleDateNight={() => setCalendarDialog({ open: true, overrides: dateNightDefaults })} />
                </StepCard>
              );
            default:
              return null;
          }
        })}
      </section>

      <section className="app-section fade-up fade-up-delay-4">
        <h2 className="text-base font-semibold">Past reviews</h2>
        {pastReviews.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">Your first completed review will show up here. Next Sunday, this list starts.</CardContent>
          </Card>
        ) : (
          <div className="grid-auto-fit">
            {pastReviews.map((item) => {
              const start = parseISO(item.week_start);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setWeekStart(start)}
                  className={cn("record-tile flex flex-col gap-2 p-4 text-left transition-all hover:border-primary/40 active:scale-[0.98] focus-ring", !item.completed_at && "border-dashed")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{weekLabel(start)}</p>
                    {item.completed_at ? <Badge variant="success">Completed</Badge> : <Badge variant="outline">{(item.completed_steps ?? []).length} of 6</Badge>}
                  </div>
                  {item.wins ? (
                    <p className="text-wrap-safe text-sm leading-5">
                      <span className="mr-1" aria-hidden>
                        🏆
                      </span>
                      {excerpt(item.wins)}
                    </p>
                  ) : null}
                  {item.focus ? (
                    <p className="text-wrap-safe text-sm leading-5 text-muted-foreground">
                      <span className="mr-1" aria-hidden>
                        🎯
                      </span>
                      {excerpt(item.focus)}
                    </p>
                  ) : null}
                  {!item.wins && !item.focus ? <p className="text-sm text-muted-foreground">No notes saved.</p> : null}
                  {item.reviewed_by?.length ? (
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <MemberAvatarStack memberIds={item.reviewed_by} size="xs" />
                      reviewed together
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <RecordFormDialog
        config={moduleConfigs.calendar}
        open={calendarDialog.open}
        onOpenChange={(open) => setCalendarDialog((current) => ({ ...current, open }))}
        defaultOverrides={calendarDialog.overrides}
      />
    </div>
  );
}
