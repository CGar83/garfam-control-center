"use client";

import { useMemo, useState } from "react";
import { startOfDay } from "date-fns";
import { ChevronDown, Flame, Plus } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { MemberChip } from "@/components/app/member-avatar";
import { PageHeader } from "@/components/app/page-header";
import { useAppData } from "@/components/app/providers";
import { familyRoutineStreak, memberFirstName, routineMatchesMember, sortRoutines, timeOfDayMeta, timeOfDayOrder, type RoutineTemplate } from "@/components/routines/helpers";
import { ManageRoutines } from "@/components/routines/manage-routines";
import { RoutineCard } from "@/components/routines/routine-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useToast } from "@/hooks/use-toast";
import { dateKey, routineCompletionFor, routineIsComplete, routineRunsOn } from "@/lib/streaks";
import type { Routine } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function RoutinesPage() {
  const { data, createRecord, updateRecord, deleteRecord, currentMember, currentMemberId } = useAppData();
  const { members } = useFamilyMembers();
  const { toast } = useToast();

  const isParent = !currentMember || currentMember.role !== "viewer";
  const isKid = Boolean(currentMember && currentMember.role === "viewer");
  const today = useMemo(() => startOfDay(new Date()), []);

  // undefined means the user has not touched the filter yet, so kids default to themselves even if members hydrate late.
  const [selection, setSelectedMemberId] = useState<string | null | undefined>(undefined);
  const selectedMemberId = selection === undefined ? (isKid ? currentMemberId : null) : selection;
  const [notTodayOpen, setNotTodayOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);

  const routines = data.routines;
  const completions = data.routine_completions;

  const filtered = useMemo(() => sortRoutines(routines.filter((routine) => routineMatchesMember(routine, selectedMemberId))), [routines, selectedMemberId]);
  const runningToday = useMemo(() => filtered.filter((routine) => routineRunsOn(routine, today)), [filtered, today]);
  const notToday = useMemo(() => filtered.filter((routine) => !routineRunsOn(routine, today)), [filtered, today]);

  const allDueToday = useMemo(() => routines.filter((routine) => routineRunsOn(routine, today)), [routines, today]);
  const completeToday = allDueToday.filter((routine) => routineIsComplete(routine, routineCompletionFor(completions, routine.id, today))).length;
  const streak = useMemo(() => familyRoutineStreak(routines, completions, today), [completions, routines, today]);

  function canToggleRoutine(routine: Routine) {
    if (isParent) return true;
    return !routine.member_id || routine.member_id === currentMemberId;
  }

  async function toggleStep(routine: Routine, index: number) {
    if (!canToggleRoutine(routine)) return;
    const existing = routineCompletionFor(completions, routine.id, today);
    const current = existing?.steps_done ?? [];
    const next = current.includes(index) ? current.filter((step) => step !== index) : [...current, index].sort((a, b) => a - b);

    if (existing) {
      await updateRecord("routine_completions", existing.id, { steps_done: next });
    } else {
      await createRecord("routine_completions", {
        routine_id: routine.id,
        member_id: routine.member_id ?? currentMemberId,
        completed_on: dateKey(today),
        steps_done: next
      });
    }

    const wasComplete = routineIsComplete(routine, existing);
    const nowComplete = routine.steps.every((_, stepIndex) => next.includes(stepIndex));
    if (nowComplete && !wasComplete) {
      const owner = members.find((member) => member.id === routine.member_id);
      toast({
        title: `${routine.emoji ?? "✅"} ${routine.title} complete`,
        description: owner ? `Great start, ${memberFirstName(owner)}.` : "Whole family, all done.",
        variant: "success"
      });
    }
  }

  async function addTemplate(template: RoutineTemplate) {
    if (!isParent) return;
    const memberId = selectedMemberId;
    const owner = members.find((member) => member.id === memberId) ?? null;
    const title = owner && template.personal ? `${memberFirstName(owner)}'s ${template.title.toLowerCase()}` : template.title;
    await createRecord("routines", {
      title,
      emoji: template.emoji,
      member_id: memberId,
      time_of_day: template.time_of_day,
      steps: template.steps,
      days_of_week: template.days_of_week,
      active: true
    });
    toast({ title: `${template.emoji} ${title} added`, description: owner ? `Now on ${memberFirstName(owner)}'s routines.` : "Added as a family routine.", variant: "success" });
  }

  const addButton = isParent ? (
    <Button onClick={() => setFormOpen(true)}>
      <Plus className="h-4 w-4" />
      Add routine
    </Button>
  ) : undefined;

  const percent = allDueToday.length === 0 ? 0 : Math.round((completeToday / allDueToday.length) * 100);

  return (
    <div className="app-page">
      <PageHeader
        title="Routines"
        description={isKid ? "Tap each step as you go. Finish the list and the whole routine lights up." : "Morning launches, bedtime wind-downs, and family resets as tappable checklists."}
        action={addButton}
      />

      <Card className="fade-up">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">
              {allDueToday.length === 0
                ? "No routines run today"
                : completeToday === allDueToday.length
                  ? `All ${allDueToday.length} routine${allDueToday.length === 1 ? "" : "s"} complete today. 🎉`
                  : `${completeToday} of ${allDueToday.length} routine${allDueToday.length === 1 ? "" : "s"} complete today`}
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Routines completed today">
              <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.max(percent > 0 ? 3 : 0, percent)}%` }} />
            </div>
          </div>
          <div
            className={cn(
              "flex shrink-0 items-center gap-2 self-start rounded-2xl px-4 py-2 sm:self-auto",
              streak > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "bg-muted text-muted-foreground"
            )}
            title="Days in a row where every routine was finished"
          >
            <Flame className="h-5 w-5" aria-hidden />
            <div className="leading-tight">
              <p className="text-lg font-bold tabular-nums">{streak}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">day family streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="fade-up fade-up-delay-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="group" aria-label="Filter routines by person">
        <MemberChip member={null} active={selectedMemberId === null} onClick={() => setSelectedMemberId(null)} />
        {members.map((member) => (
          <MemberChip key={member.id} member={member} active={selectedMemberId === member.id} onClick={() => setSelectedMemberId(member.id)} />
        ))}
      </div>

      {runningToday.length === 0 ? (
        <div className="fade-up fade-up-delay-2">
          <EmptyState
            title={routines.length === 0 ? "No routines yet" : "Nothing scheduled for today"}
            description={
              routines.length === 0
                ? "Build a morning routine for each kid so the launch runs itself. Templates below get you started in one tap."
                : notToday.length > 0
                  ? "Routines for other days are listed below."
                  : "Try picking a different person, or add a routine that runs today."
            }
            action={addButton}
          />
        </div>
      ) : (
        <div className="fade-up fade-up-delay-2 app-section">
          {timeOfDayOrder.map((slot) => {
            const group = runningToday.filter((routine) => routine.time_of_day === slot);
            if (group.length === 0) return null;
            const meta = timeOfDayMeta[slot];
            return (
              <section key={slot} className="app-section">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-lg font-semibold">
                    <span aria-hidden>{meta.emoji}</span> {meta.label}
                  </h2>
                  <p className="text-sm text-muted-foreground">{meta.blurb}</p>
                </div>
                <div className="grid-auto-fit">
                  {group.map((routine) => (
                    <RoutineCard
                      key={routine.id}
                      routine={routine}
                      completion={routineCompletionFor(completions, routine.id, today)}
                      members={members}
                      canToggle={canToggleRoutine(routine)}
                      isParent={isParent}
                      onToggleStep={(index) => void toggleStep(routine, index)}
                      onEdit={isParent ? () => setEditing(routine) : undefined}
                      onToggleActive={isParent ? () => void updateRecord("routines", routine.id, { active: !routine.active }) : undefined}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {notToday.length > 0 ? (
        <section className="surface-panel">
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left focus-ring"
            aria-expanded={notTodayOpen}
            onClick={() => setNotTodayOpen((open) => !open)}
          >
            <span className="text-sm font-semibold">
              Not today <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{notToday.length}</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", notTodayOpen && "rotate-180")} aria-hidden />
          </button>
          {notTodayOpen ? (
            <ul className="divide-y divide-border/70 border-t border-border/70">
              {notToday.map((routine) => {
                const owner = members.find((member) => member.id === routine.member_id) ?? null;
                return (
                  <li key={routine.id} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", !routine.active && "opacity-60")}>
                    <span className="text-lg" aria-hidden>
                      {routine.emoji ?? "✅"}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{routine.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {owner ? memberFirstName(owner) : "Family"} · {routine.active ? timeOfDayMeta[routine.time_of_day].label : "Paused"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}

      {isParent ? (
        <ManageRoutines
          members={members}
          routines={sortRoutines(routines)}
          selectedMemberId={selectedMemberId}
          onToggleActive={(routine) => void updateRecord("routines", routine.id, { active: !routine.active })}
          onDelete={async (routine) => {
            await deleteRecord("routines", routine.id);
            toast({ title: "Routine deleted", variant: "success" });
          }}
          onAddTemplate={addTemplate}
          formOpen={formOpen}
          onFormOpenChange={setFormOpen}
          editing={editing}
          onEditingChange={setEditing}
        />
      ) : null}
    </div>
  );
}
