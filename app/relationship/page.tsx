"use client";

import { useMemo, useState } from "react";
import { addDays } from "date-fns";
import {
  AlertTriangle,
  Brain,
  MessageCircleHeart,
  Plus,
  RefreshCcw,
  Scale,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/pages/data-table";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { DateBadge } from "@/components/app/date-badge";
import { PriorityBadge } from "@/components/app/priority-badge";
import { PrivacyMask } from "@/components/app/privacy-mask";
import { StatusBadge } from "@/components/app/status-badge";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { moduleConfigs } from "@/lib/modules";
import type { RelationshipRecord } from "@/lib/types";
import { isOverdue, safeNumber } from "@/lib/utils";

const config = moduleConfigs.relationship;

const practiceTemplates = [
  {
    title: "Daily stress-reducing conversation",
    category: "Stress",
    practice: "Stress-reducing conversation",
    priority: "high",
    dueOffset: 0,
    notes: "Twenty minutes. Outside stress only. Listener offers empathy, takes partner's side, and avoids fixing unless asked.",
    next_step: "Ask: do you want empathy, help, or just a witness?"
  },
  {
    title: "Six-second kiss and landing hug",
    category: "Daily Connection",
    practice: "Six-second kiss",
    priority: "low",
    dueOffset: 0,
    notes: "Use a real goodbye and real hello to reset the couple bubble before the day takes over.",
    next_step: "Six-second kiss in the morning; hug until relaxed after work."
  },
  {
    title: "Weekly state of the union",
    category: "Check-In",
    practice: "Weekly state of the union",
    priority: "medium",
    dueOffset: 3,
    notes: "Appreciations first, then one issue with soft startup, then one concrete request each.",
    next_step: "Each partner brings one appreciation and one specific request."
  },
  {
    title: "Repair attempt",
    category: "Repair",
    practice: "Repair attempt",
    priority: "high",
    dueOffset: 0,
    notes: "Repair early: restart, pause, name flooding, offer touch, or say what you can own.",
    repair_attempt: "Can we restart? I want to understand you, not win."
  },
  {
    title: "A.R.E. connection check",
    category: "Attachment",
    practice: "A.R.E. check",
    priority: "medium",
    dueOffset: 1,
    notes: "Ask whether each partner feels accessibility, responsiveness, and engagement.",
    next_step: "Each answer: where did I feel you with me, and where did I miss you?"
  },
  {
    title: "Desire brakes check",
    category: "Intimacy",
    practice: "Desire brakes check",
    priority: "medium",
    dueOffset: 5,
    notes: "Look for stress, resentment, exhaustion, pressure, body worry, and context before blaming desire.",
    next_step: "Remove one brake before trying to press the accelerator."
  }
] as const;

const frameworkCards = [
  {
    title: "Gottman Habit Layer",
    icon: MessageCircleHeart,
    points: ["Catch bids for connection", "Keep a 5:1 positive-to-negative ratio", "Use soft startup and accept repairs", "Watch the Four Horsemen"]
  },
  {
    title: "EFT Attachment Layer",
    icon: ShieldCheck,
    points: ["Name the negative cycle as the enemy", "Track A.R.E.: accessibility, responsiveness, engagement", "Notice raw spots", "Move from blame to longing"]
  },
  {
    title: "Fairness and Power Layer",
    icon: Scale,
    points: ["Serve the relationship, not the argument", "Avoid one-up and one-down roles", "Name emotional labor directly", "Practice full-respect living"]
  },
  {
    title: "Nervous System Layer",
    icon: Brain,
    points: ["Pause when flooded", "Take at least 20 minutes to self-soothe", "Protect launchings and landings", "Build a couple bubble"]
  },
  {
    title: "Desire and Aliveness Layer",
    icon: Sparkles,
    points: ["Responsive desire is normal", "Context is everything", "Reduce brakes before pushing for acceleration", "Keep novelty and separateness alive"]
  }
];

function ratioLabel(positive: number, negative: number) {
  if (negative === 0) return positive > 0 ? "All positive" : "No data";
  return `${(positive / negative).toFixed(1)}:1`;
}

function nextDue(records: RelationshipRecord[]) {
  return [...records]
    .filter((record) => record.status !== "done" && record.due_at)
    .sort((a, b) => new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime())[0];
}

export default function RelationshipPage() {
  const records = useRealtimeTable("relationship_records") as RelationshipRecord[];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefaults, setDialogDefaults] = useState<Record<string, unknown> | undefined>();
  const dueRecord = nextDue(records);

  const stats = useMemo(() => {
    const open = records.filter((record) => record.status !== "done");
    const overdue = open.filter((record) => isOverdue(record.due_at));
    const scores = records.map((record) => record.connection_score).filter((score): score is number => typeof score === "number");
    const averageScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const positive = records.reduce((sum, record) => sum + safeNumber(record.positive_interactions), 0);
    const negative = records.reduce((sum, record) => sum + safeNumber(record.negative_interactions), 0);
    const repairs = records.filter((record) => record.category === "Repair" && record.status !== "done").length;

    return { open: open.length, overdue: overdue.length, averageScore, positive, negative, repairs };
  }, [records]);

  function templateDefaults(item: (typeof practiceTemplates)[number]) {
    return {
      ...item,
      status: "not_started",
      due_at: addDays(new Date(), item.dueOffset).toISOString().slice(0, 16),
      connection_score: 7,
      positive_interactions: 5,
      negative_interactions: 1,
      cycle_name: "None",
      tags: [String(item.practice).split(" ")[0].toLowerCase(), "relationship"]
    };
  }

  function openBlankDialog() {
    setDialogDefaults(undefined);
    setDialogOpen(true);
  }

  function openTemplateDialog(item: (typeof practiceTemplates)[number]) {
    setDialogDefaults(templateDefaults(item));
    setDialogOpen(true);
  }

  return (
    <div className="orderful-page">
      <div className="app-page max-w-[1320px]">
        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="orderful-card flex min-h-96 flex-col justify-between p-6 lg:p-8">
            <div>
              <p className="orderful-eyebrow">Marriage health hub</p>
              <h1 className="orderful-display mt-5 max-w-3xl text-4xl sm:text-5xl lg:text-6xl">Relationship Command Center</h1>
              <p className="orderful-muted mt-6 max-w-2xl text-base leading-7 sm:text-lg">
                A practical operating layer for stress release, connection rituals, conflict repair, attachment cycles, fairness, intimacy, and weekly check-ins.
              </p>
            </div>

            <div className="mt-8">
              <div className="flex flex-wrap gap-3">
                <Button size="lg" onClick={openBlankDialog}>
                  <Plus className="h-4 w-4" />
                  Add Check-In
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="#relationship-records">View Records</a>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 border-t orderful-rule pt-6 sm:grid-cols-3">
                {["Practice first", "Repair early", "Protect privacy"].map((item, index) => (
                  <div key={item} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--color-cloud)] text-xs font-semibold text-[var(--color-slate-700)] dark:border-border dark:text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm font-medium text-[var(--color-slate-900)] dark:text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="orderful-carbon flex min-h-96 flex-col justify-between p-6 lg:p-8">
            <div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-medium uppercase leading-6 text-white/60">Next touchpoint</p>
                <span className="rounded-md bg-[var(--color-vermillion-signal)] px-2 py-1 text-xs font-semibold uppercase text-white">Live</span>
              </div>

              {dueRecord ? (
                <div className="mt-6 space-y-6">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-wrap-safe max-w-sm text-2xl font-semibold leading-tight text-white sm:text-3xl">{dueRecord.title}</h2>
                      <StatusBadge status={dueRecord.status} />
                    </div>
                    <p className="mt-3 text-sm text-white/60">{dueRecord.practice}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DateBadge value={dueRecord.due_at} />
                    <PriorityBadge priority={dueRecord.priority} />
                  </div>
                  <div className="border-t border-white/10 pt-5">
                    <p className="text-xs font-medium uppercase leading-6 text-white/60">Next step</p>
                    <p className="mt-2 text-sm leading-6 text-white/75">
                      <PrivacyMask value={dueRecord.next_step} sensitive>
                        {dueRecord.next_step || "Add a concrete next step."}
                      </PrivacyMask>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-8">
                  <h2 className="text-3xl font-semibold text-white">No open touchpoints.</h2>
                  <p className="mt-3 text-sm text-white/60">Add one small ritual for this week.</p>
                </div>
              )}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
              {[
                ["Open", stats.open],
                ["Score", stats.averageScore ? stats.averageScore.toFixed(1) : "None"],
                ["Ratio", ratioLabel(stats.positive, stats.negative)]
              ].map(([label, value]) => (
                <div key={label} className="bg-[var(--color-carbon)] p-3">
                  <p className="text-[11px] font-medium uppercase text-white/50">{label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid-auto-fit-sm">
          {[
            ["Open Practices", stats.open, "active rituals"],
            ["Overdue Repairs", stats.overdue, "needs attention"],
            ["Connection Score", stats.averageScore ? stats.averageScore.toFixed(1) : "No data", "average out of 10"],
            ["5:1 Ratio", ratioLabel(stats.positive, stats.negative), `${stats.positive} positive / ${stats.negative} negative`],
            ["Repair Queue", stats.repairs, "open repairs"]
          ].map(([label, value, helper]) => (
            <div key={label} className="orderful-card p-5">
              <p className="orderful-eyebrow">{label}</p>
              <p className="text-wrap-safe mt-4 text-3xl font-semibold leading-tight text-[var(--color-slate-900)] dark:text-foreground sm:text-4xl">{value}</p>
              <p className="orderful-muted mt-3 text-sm">{helper}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-8 border-t orderful-rule pt-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <div>
            <p className="orderful-eyebrow">Operating loop</p>
            <h2 className="orderful-display mt-4 text-3xl sm:text-4xl lg:text-5xl">Two practices this week. Then repeat.</h2>
            <p className="orderful-muted mt-5 text-base leading-7">
              The guide is evidence-weighted, but the page is practice-weighted: stress conversations, affection rituals, repairs, and weekly check-ins.
            </p>
          </div>

          <div className="grid-auto-fit">
            {practiceTemplates.map((item) => (
              <button
                key={item.title}
                className="orderful-panel p-5 text-left transition-colors hover:border-[var(--color-cloud)] hover:bg-white focus-ring"
                onClick={() => openTemplateDialog(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-wrap-safe text-lg font-semibold text-[var(--color-slate-900)] dark:text-foreground">{item.title}</p>
                    <p className="orderful-muted mt-2 text-sm leading-6">{item.notes}</p>
                  </div>
                  <PriorityBadge priority={item.priority} />
                </div>
                <Badge variant="outline" className="mt-4 border-[var(--color-cloud)] bg-white text-[var(--color-slate-700)] dark:border-border dark:bg-white/5 dark:text-foreground">
                  {item.practice}
                </Badge>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="max-w-3xl">
            <p className="orderful-eyebrow">Framework map</p>
            <h2 className="orderful-display mt-4 text-3xl sm:text-4xl lg:text-5xl">One system, five layers.</h2>
          </div>
          <div className="grid-auto-fit-sm">
            {frameworkCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="orderful-card p-6">
                  <Icon className="h-5 w-5 text-[var(--color-slate-600)]" />
                  <h3 className="text-wrap-safe mt-5 text-xl font-semibold leading-snug text-[var(--color-slate-900)] dark:text-foreground">{card.title}</h3>
                  <ul className="orderful-muted mt-5 space-y-3 text-sm leading-5">
                    {card.points.map((point) => (
                      <li key={point} className="border-t orderful-rule pt-3">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid-auto-fit-lg">
          <div className="orderful-carbon p-6">
            <p className="text-xs font-medium uppercase leading-6 text-white/60">Conflict first aid</p>
            <h2 className="text-wrap-safe mt-4 text-2xl font-semibold text-white">When the conversation tilts</h2>
            <div className="mt-6 divide-y divide-white/10 text-sm">
              <div className="py-4">
                <p className="font-medium text-white">Soft startup</p>
                <p className="mt-1 text-white/70">I feel X about Y, and I need Z.</p>
              </div>
              <div className="py-4">
                <p className="font-medium text-white">Flooding break</p>
                <p className="mt-1 text-white/70">Pause at least 20 minutes, self-soothe, and return with an agreed time.</p>
              </div>
              <div className="py-4">
                <p className="font-medium text-white">Horsemen antidotes</p>
                <p className="mt-1 text-white/70">Complaint, appreciation, responsibility, and self-soothing replace criticism, contempt, defensiveness, and stonewalling.</p>
              </div>
            </div>
          </div>

          <div className="orderful-panel p-6">
            <p className="orderful-eyebrow">State of the union</p>
            <h2 className="text-wrap-safe mt-4 text-2xl font-semibold text-[var(--color-slate-900)] dark:text-foreground">A contained weekly ritual</h2>
            <div className="mt-6 divide-y divide-[var(--color-frost)] text-sm text-[var(--color-slate-700)] dark:divide-border dark:text-muted-foreground">
              {["Appreciations first", "One issue with soft startup", "One concrete request each", "End with affection or shared meaning"].map((item) => (
                <div key={item} className="flex items-center gap-3 py-4">
                  <RefreshCcw className="h-4 w-4 text-[var(--color-slate-600)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="orderful-panel p-6">
            <p className="orderful-eyebrow">Safety and scope</p>
            <h2 className="text-wrap-safe mt-4 text-2xl font-semibold text-[var(--color-slate-900)] dark:text-foreground">Know when the app is not enough</h2>
            <div className="orderful-muted mt-6 border-t orderful-rule pt-5 text-sm leading-6">
              <div className="mb-4 flex gap-3 text-[var(--color-slate-900)] dark:text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-vermillion-signal)]" />
                <p>Do not use shared tracking as a weapon, scoreboard, or surveillance tool.</p>
              </div>
              <p>If either partner feels unsafe, coerced, trapped, or afraid, use professional support and emergency resources rather than a shared app workflow.</p>
            </div>
          </div>
        </section>

        <section id="relationship-records" className="space-y-5">
          <div className="max-w-3xl">
            <p className="orderful-eyebrow">Private log</p>
            <h2 className="orderful-display mt-4 text-3xl sm:text-4xl lg:text-5xl">Relationship Records</h2>
            <p className="orderful-muted mt-4 text-base leading-7">Check-ins, rituals, repairs, state-of-the-union notes, cycle maps, and intimacy/context notes.</p>
          </div>
          <DataTable config={config} records={records} />
        </section>
      </div>

      <RecordFormDialog
        config={config}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogDefaults(undefined);
        }}
        defaultOverrides={dialogDefaults}
      />
    </div>
  );
}
