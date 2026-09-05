"use client";

import { useState } from "react";
import { Check, Flame, Loader2, Pencil } from "lucide-react";
import { useAppData } from "@/components/app/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { firstName } from "@/lib/member-colors";
import { dateKey } from "@/lib/streaks";
import type { Checkin, FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { energyLabel, moodFace, moodLabel } from "@/components/checkin/helpers";
import { EnergyBars, EnergyPicker, MoodPicker } from "@/components/checkin/pickers";

interface CheckinFormProps {
  member: FamilyMember;
  existing: Checkin | null;
  streak: number;
  hasPartner: boolean;
}

export function CheckinForm({ member, existing, streak, hasPartner }: CheckinFormProps) {
  const { createRecord, updateRecord } = useAppData();
  const { toast } = useToast();
  const [editing, setEditing] = useState(existing === null);
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [gratitude, setGratitude] = useState(existing?.gratitude ?? "");
  const [needs, setNeeds] = useState(existing?.needs ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [showNote, setShowNote] = useState(Boolean(existing?.note));
  const [shared, setShared] = useState(existing?.shared_with_partner ?? true);
  const [saving, setSaving] = useState(false);

  const canSave = mood !== null && energy !== null && !saving;
  const name = firstName(member.display_name);

  async function save() {
    if (mood === null || energy === null) return;
    setSaving(true);
    const payload = {
      member_id: member.id,
      checkin_date: dateKey(new Date()),
      mood,
      energy,
      gratitude: gratitude.trim() || null,
      needs: needs.trim() || null,
      note: note.trim() || null,
      shared_with_partner: shared
    };
    try {
      if (existing) await updateRecord("checkins", existing.id, payload);
      else await createRecord("checkins", payload);
      setEditing(false);
      toast({
        title: existing ? "Check-in updated" : "Checked in",
        description: shared && hasPartner ? "Your partner can see it now." : "Saved for you.",
        variant: "success"
      });
    } catch (error) {
      toast({ title: "Could not save", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!editing && existing) {
    return (
      <section className="hero-card fade-up p-5 sm:p-7">
        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white/80">Today&apos;s check-in</p>
              <h1 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">You checked in, {name}. Nice.</h1>
            </div>
            <div className="flex items-center gap-2">
              {streak > 0 ? (
                <span className="pop-in inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold backdrop-blur">
                  <Flame className="h-4 w-4" />
                  {streak} day{streak === 1 ? "" : "s"}
                </span>
              ) : null}
              <Button variant="secondary" size="sm" className="bg-white/90 text-neutral-900 hover:bg-white" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <div className="flex items-center gap-4 rounded-2xl bg-white/15 p-4 backdrop-blur sm:flex-col sm:items-start sm:justify-center">
              <span className="text-5xl leading-none" aria-hidden>
                {moodFace(existing.mood)}
              </span>
              <div>
                <p className="text-base font-semibold">{moodLabel(existing.mood)}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-white/85">
                  <EnergyBars value={existing.energy} onHero />
                  {energyLabel(existing.energy)} energy
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Grateful for</p>
                <p className="text-wrap-safe mt-1 text-sm leading-6">{existing.gratitude || "—"}</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">I need</p>
                <p className="text-wrap-safe mt-1 text-sm leading-6">{existing.needs || "—"}</p>
              </div>
              {existing.note ? (
                <div className="rounded-2xl bg-white/15 p-4 backdrop-blur sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Note</p>
                  <p className="text-wrap-safe mt-1 text-sm leading-6">{existing.note}</p>
                </div>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-white/75">{existing.shared_with_partner ? "Shared with your partner." : "Kept private to you."}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="hero-card fade-up p-5 sm:p-7">
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white/80">Thirty seconds, honestly</p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">How is today going, {name}?</h1>
          </div>
          {streak > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold backdrop-blur">
              <Flame className="h-4 w-4" />
              {streak} day streak
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-white/90">Mood</p>
          <MoodPicker value={mood} onChange={setMood} onHero />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-white/90">Energy</p>
          <EnergyPicker value={energy} onChange={setEnergy} onHero />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-white/90">
            One thing I&apos;m grateful for
            <Input
              value={gratitude}
              onChange={(event) => setGratitude(event.target.value)}
              placeholder="Coffee was hot and nobody spilled it"
              maxLength={200}
              className="h-12 border-white/30 bg-white/90 text-neutral-900 placeholder:text-neutral-500 focus:bg-white dark:bg-white/90 dark:focus:bg-white"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-white/90">
            One thing I need
            <Input
              value={needs}
              onChange={(event) => setNeeds(event.target.value)}
              placeholder="A quiet hour on Saturday"
              maxLength={200}
              className="h-12 border-white/30 bg-white/90 text-neutral-900 placeholder:text-neutral-500 focus:bg-white dark:bg-white/90 dark:focus:bg-white"
            />
          </label>
        </div>

        {showNote ? (
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-white/90">
            Anything else
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Context your partner should know"
              rows={2}
              className="min-h-20 border-white/30 bg-white/90 text-neutral-900 placeholder:text-neutral-500 focus:bg-white dark:bg-white/90 dark:focus:bg-white"
            />
          </label>
        ) : (
          <button type="button" onClick={() => setShowNote(true)} className="self-start text-sm font-medium text-white/85 underline-offset-4 hover:underline focus-ring">
            + Add a note
          </button>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            role="switch"
            aria-checked={shared}
            onClick={() => setShared((current) => !current)}
            className="inline-flex min-h-11 items-center gap-3 self-start rounded-full py-1 pr-2 text-sm font-medium text-white/90 focus-ring"
          >
            <span className={cn("relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors", shared ? "border-white bg-white" : "border-white/50 bg-white/20")}>
              <span className={cn("absolute h-5 w-5 rounded-full shadow transition-transform", shared ? "translate-x-6 bg-primary" : "translate-x-1 bg-white")} />
            </span>
            Share with partner
          </button>
          <div className="flex gap-2">
            {existing ? (
              <Button variant="ghost" className="text-white hover:bg-white/15 hover:text-white" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            ) : null}
            <Button size="lg" disabled={!canSave} onClick={() => void save()} className="bg-white text-neutral-900 shadow-lg hover:bg-white/95 disabled:bg-white/60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {existing ? "Save changes" : "Check in"}
            </Button>
          </div>
        </div>
        {mood === null || energy === null ? <p className="text-xs text-white/75">Pick a mood and an energy level to save.</p> : null}
      </div>
    </section>
  );
}
