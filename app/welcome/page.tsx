"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, HeartHandshake, Home, Plus, ShoppingCart, Sparkles, Trash2, Trophy, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppData, type FamilySetup, type FamilySetupMember } from "@/components/app/providers";
import { useToast } from "@/hooks/use-toast";
import { APP_NAME, APP_TAGLINE, ONBOARDING_KEY } from "@/lib/constants";
import { memberColorOrder, memberPalettes } from "@/lib/member-colors";
import type { MemberColor } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "intro" | "family" | "adults" | "kids" | "focus" | "done";

interface DraftMember {
  key: string;
  name: string;
  relationship: string;
  birthdate: string;
  color: MemberColor;
}

const steps: Step[] = ["intro", "family", "adults", "kids", "focus", "done"];

const focusAreas = [
  { key: "calendar", label: "One shared calendar", icon: CalendarDays, blurb: "Color-coded by person, with tasks and appointments in one view." },
  { key: "chores", label: "Chores kids actually do", icon: Trophy, blurb: "Points, streaks, and a reward store." },
  { key: "meals", label: "Dinner without the scramble", icon: Utensils, blurb: "Recipe box, weekly plan, one-tap grocery list." },
  { key: "lists", label: "Lists we both can edit", icon: ShoppingCart, blurb: "Grocery, packing, weekend to-dos, wishlists." },
  { key: "us", label: "Staying connected", icon: HeartHandshake, blurb: "Thirty-second daily check-ins and a Sunday reset." },
  { key: "memories", label: "Remembering the good stuff", icon: Sparkles, blurb: "A one-line family journal and countdowns." }
];

function ageFromBirthdate(birthdate: string) {
  if (!birthdate) return null;
  const date = new Date(birthdate);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function starterChoresFor(age: number | null): FamilySetup["chores"] {
  if (age === null || age <= 6) {
    return [
      { title: "Make bed", emoji: "🛏️", points: 5, frequency: "daily", time_of_day: "morning", memberIndex: 0 },
      { title: "Put toys away", emoji: "🧸", points: 5, frequency: "daily", time_of_day: "evening", memberIndex: 0 }
    ];
  }
  if (age <= 11) {
    return [
      { title: "Make bed", emoji: "🛏️", points: 5, frequency: "daily", time_of_day: "morning", memberIndex: 0 },
      { title: "Set the table", emoji: "🍽️", points: 5, frequency: "daily", time_of_day: "evening", memberIndex: 0 },
      { title: "Tidy room", emoji: "🧹", points: 10, frequency: "weekly", time_of_day: "anytime", memberIndex: 0 }
    ];
  }
  return [
    { title: "Unload dishwasher", emoji: "🍽️", points: 10, frequency: "daily", time_of_day: "morning", memberIndex: 0 },
    { title: "Take out trash", emoji: "🗑️", points: 10, frequency: "weekly", time_of_day: "evening", memberIndex: 0 },
    { title: "Laundry", emoji: "🧺", points: 15, frequency: "weekly", time_of_day: "anytime", memberIndex: 0 }
  ];
}

export default function WelcomePage() {
  const router = useRouter();
  const { setupFamily, restoreStarterData } = useAppData();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("intro");
  const [familyName, setFamilyName] = useState("");
  const [adults, setAdults] = useState<DraftMember[]>([
    { key: "a1", name: "", relationship: "Parent", birthdate: "", color: "coral" },
    { key: "a2", name: "", relationship: "Parent", birthdate: "", color: "ocean" }
  ]);
  const [kids, setKids] = useState<DraftMember[]>([{ key: "k1", name: "", relationship: "Child", birthdate: "", color: "lavender" }]);
  const [focus, setFocus] = useState<string[]>(["calendar", "chores", "meals"]);
  const [saving, setSaving] = useState(false);

  const stepIndex = steps.indexOf(step);
  const usedColors = useMemo(() => new Set([...adults, ...kids].map((member) => member.color)), [adults, kids]);

  function nextColor() {
    return memberColorOrder.find((color) => !usedColors.has(color)) ?? memberColorOrder[(adults.length + kids.length) % memberColorOrder.length];
  }

  function updateMember(list: "adults" | "kids", key: string, patch: Partial<DraftMember>) {
    const setter = list === "adults" ? setAdults : setKids;
    setter((current) => current.map((member) => (member.key === key ? { ...member, ...patch } : member)));
  }

  function removeMember(list: "adults" | "kids", key: string) {
    const setter = list === "adults" ? setAdults : setKids;
    setter((current) => current.filter((member) => member.key !== key));
  }

  function addMember(list: "adults" | "kids") {
    const setter = list === "adults" ? setAdults : setKids;
    setter((current) => [
      ...current,
      { key: `${list}-${Date.now()}`, name: "", relationship: list === "adults" ? "Parent" : "Child", birthdate: "", color: nextColor() }
    ]);
  }

  const validAdults = adults.filter((member) => member.name.trim());
  const validKids = kids.filter((member) => member.name.trim());
  const canContinue =
    step === "family" ? familyName.trim().length > 0 : step === "adults" ? validAdults.length > 0 : true;

  async function finish() {
    if (saving) return;
    setSaving(true);
    try {
      const members: FamilySetupMember[] = [
        ...validAdults.map((member) => ({ display_name: member.name, role: "admin" as const, relationship: member.relationship || "Parent", birthdate: null, color: member.color })),
        ...validKids.map((member) => ({ display_name: member.name, role: "viewer" as const, relationship: member.relationship || "Child", birthdate: member.birthdate || null, color: member.color }))
      ];
      // The second adult is a parent (not admin) so role semantics stay clear.
      if (members.length > 1 && validAdults.length > 1) members[1] = { ...members[1], role: "parent" };

      const chores: NonNullable<FamilySetup["chores"]> = [];
      const routines: NonNullable<FamilySetup["routines"]> = [];
      validKids.forEach((kid, index) => {
        const memberIndex = validAdults.length + index;
        const age = ageFromBirthdate(kid.birthdate);
        for (const chore of starterChoresFor(age) ?? []) chores.push({ ...chore, memberIndex });
        routines.push({
          title: `${kid.name.trim().split(" ")[0]}'s morning launch`,
          emoji: "🌅",
          time_of_day: "morning",
          steps: ["Get dressed", "Eat breakfast", "Brush teeth", "Pack backpack", "Shoes on"],
          days_of_week: [1, 2, 3, 4, 5],
          memberIndex
        });
        routines.push({
          title: `${kid.name.trim().split(" ")[0]}'s bedtime wind-down`,
          emoji: "🌙",
          time_of_day: "evening",
          steps: ["Bath or shower", "Pajamas", "Brush teeth", "Read", "Lights out"],
          days_of_week: [],
          memberIndex
        });
      });
      const rewards: NonNullable<FamilySetup["rewards"]> = validKids.length
        ? [
            { title: "Pick the Friday movie", emoji: "🎬", cost_points: 40 },
            { title: "30 extra minutes of screen time", emoji: "🎮", cost_points: 30 },
            { title: "Ice cream run", emoji: "🍦", cost_points: 50 }
          ]
        : [];

      await setupFamily({ familyName, members, chores, routines, rewards });
      localStorage.setItem(ONBOARDING_KEY, "true");
      localStorage.setItem("gather-focus", JSON.stringify(focus));
      toast({ title: `Welcome to ${APP_NAME}`, description: `${familyName.trim()} is set up. Today is ready.`, variant: "success" });
      router.replace("/today");
    } catch (error) {
      toast({ title: "Could not finish setup", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
      setSaving(false);
    }
  }

  function useSampleFamily() {
    restoreStarterData();
    localStorage.setItem(ONBOARDING_KEY, "true");
    toast({ title: "Sample family loaded", description: "Explore with the Riveras. Reset any time from Settings." });
    router.replace("/today");
  }

  function renderMemberRows(list: "adults" | "kids", items: DraftMember[]) {
    return (
      <div className="space-y-3">
        {items.map((member, index) => (
          <div key={member.key} className="fade-up rounded-2xl border border-border/70 bg-white/70 p-3 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: memberPalettes[member.color].solid, color: memberPalettes[member.color].onSolid }}>
                {member.name.trim() ? member.name.trim().charAt(0).toUpperCase() : index + 1}
              </span>
              <Input
                autoFocus={index === 0 && !member.name}
                value={member.name}
                onChange={(event) => updateMember(list, member.key, { name: event.target.value })}
                placeholder={list === "adults" ? (index === 0 ? "Your first name" : "Partner's first name") : "Child's first name"}
                className="h-11 flex-1"
                aria-label={`${list === "adults" ? "Adult" : "Child"} ${index + 1} name`}
              />
              {items.length > 1 || list === "kids" ? (
                <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => removeMember(list, member.key)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {list === "kids" ? (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Birthday
                  <Input type="date" value={member.birthdate} onChange={(event) => updateMember(list, member.key, { birthdate: event.target.value })} className="h-9 w-40" />
                </label>
              ) : (
                <Input
                  value={member.relationship}
                  onChange={(event) => updateMember(list, member.key, { relationship: event.target.value })}
                  placeholder="Mom, Dad, Parent"
                  className="h-9 w-36"
                  aria-label="Relationship"
                />
              )}
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Color">
                {memberColorOrder.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={member.color === color}
                    aria-label={memberPalettes[color].label}
                    onClick={() => updateMember(list, member.key, { color })}
                    className={cn("h-7 w-7 rounded-full border-2 transition-all focus-ring", member.color === color ? "scale-110 border-foreground" : "border-transparent opacity-80")}
                    style={{ backgroundColor: memberPalettes[color].solid }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" className="w-full" onClick={() => addMember(list)}>
          <Plus className="h-4 w-4" />
          {list === "adults" ? "Add another adult" : "Add a child"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-8 sm:py-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--brand-glow)]">
            <Home className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        {step !== "intro" && step !== "done" ? (
          <div className="flex items-center gap-1.5" aria-label={`Step ${stepIndex} of ${steps.length - 2}`}>
            {steps.slice(1, -1).map((item, index) => (
              <span key={item} className={cn("h-1.5 rounded-full transition-all", index + 1 <= stepIndex ? "w-6 bg-primary" : "w-3 bg-border")} />
            ))}
          </div>
        ) : null}
      </header>

      <main className="flex flex-1 flex-col justify-center py-10">
        {step === "intro" ? (
          <section className="fade-up">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{APP_TAGLINE}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">One place for the whole family&apos;s day.</h1>
            <p className="mt-4 max-w-lg text-base text-muted-foreground">
              The calendar, chores, dinner, lists, and the little moments, shared between you and your partner and simple enough for the kids to use.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {focusAreas.slice(0, 3).map((area) => {
                const Icon = area.icon;
                return (
                  <div key={area.key} className="surface-panel p-4">
                    <Icon className="h-5 w-5 text-primary" />
                    <p className="mt-2 text-sm font-semibold">{area.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{area.blurb}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Button size="lg" onClick={() => setStep("family")}>
                Set up my family
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={useSampleFamily}>
                Explore with a sample family
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Everything stays on this device until you connect an account in Settings.</p>
          </section>
        ) : null}

        {step === "family" ? (
          <section className="fade-up space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">What should we call your family?</h1>
              <p className="mt-2 text-sm text-muted-foreground">This shows up at the top of the app and on the calendar export.</p>
            </div>
            <Input
              autoFocus
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              placeholder="The Garmons"
              className="h-14 text-lg"
              aria-label="Family name"
              onKeyDown={(event) => {
                if (event.key === "Enter" && canContinue) setStep("adults");
              }}
            />
          </section>
        ) : null}

        {step === "adults" ? (
          <section className="fade-up space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Who are the grown-ups?</h1>
              <p className="mt-2 text-sm text-muted-foreground">You first. Each person gets a color that follows them through the whole app.</p>
            </div>
            {renderMemberRows("adults", adults)}
          </section>
        ) : null}

        {step === "kids" ? (
          <section className="fade-up space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">And the kids?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Birthdays power countdowns and age-appropriate starter chores. Kids get a simplified view with money and health hidden.
              </p>
            </div>
            {renderMemberRows("kids", kids)}
            <button type="button" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline" onClick={() => { setKids([]); setStep("focus"); }}>
              No kids yet, skip this
            </button>
          </section>
        ) : null}

        {step === "focus" ? (
          <section className="fade-up space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">What matters most right now?</h1>
              <p className="mt-2 text-sm text-muted-foreground">Pick a few. Everything stays available, this just shapes what we highlight.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {focusAreas.map((area) => {
                const Icon = area.icon;
                const active = focus.includes(area.key);
                return (
                  <button
                    key={area.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFocus((current) => (active ? current.filter((key) => key !== area.key) : [...current, area.key]))}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all focus-ring",
                      active ? "border-primary bg-primary/10 shadow-sm" : "border-border/70 bg-white/70 hover:border-primary/40 dark:bg-white/5"
                    )}
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {active ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{area.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{area.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {step === "done" ? (
          <section className="fade-up space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Ready, {validAdults[0]?.name.trim().split(" ")[0] || "friend"}.</h1>
              <p className="mt-2 text-sm text-muted-foreground">Here is what we will set up for {familyName.trim() || "your family"}.</p>
            </div>
            <div className="surface-panel divide-y divide-border/70">
              <div className="flex items-center gap-3 p-4">
                <div className="flex -space-x-2">
                  {[...validAdults, ...validKids].map((member) => (
                    <span key={member.key} className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ring-2 ring-background" style={{ backgroundColor: memberPalettes[member.color].solid, color: memberPalettes[member.color].onSolid }}>
                      {member.name.trim().charAt(0).toUpperCase()}
                    </span>
                  ))}
                </div>
                <p className="text-sm">
                  <span className="font-semibold">{validAdults.length + validKids.length} people</span>
                  <span className="text-muted-foreground"> · {validAdults.length} adult{validAdults.length === 1 ? "" : "s"}, {validKids.length} kid{validKids.length === 1 ? "" : "s"}</span>
                </p>
              </div>
              {validKids.length ? (
                <div className="p-4 text-sm">
                  <p className="font-semibold">Starter chores, routines, and rewards</p>
                  <p className="mt-1 text-muted-foreground">Age-based chores, a morning launch and bedtime routine per kid, and three rewards to spend points on. Edit anything later.</p>
                </div>
              ) : null}
              <div className="p-4 text-sm">
                <p className="font-semibold">Focus</p>
                <p className="mt-1 text-muted-foreground">{focus.map((key) => focusAreas.find((area) => area.key === key)?.label).filter(Boolean).join(" · ") || "Everything"}</p>
              </div>
            </div>
            <Button size="lg" className="w-full sm:w-auto" onClick={finish} disabled={saving}>
              {saving ? "Setting up" : "Open Today"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </section>
        ) : null}
      </main>

      {step !== "intro" && step !== "done" ? (
        <footer className="flex items-center justify-between border-t border-border/70 pt-4">
          <Button variant="ghost" onClick={() => setStep(steps[stepIndex - 1])}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => setStep(steps[stepIndex + 1])} disabled={!canContinue}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </footer>
      ) : null}
    </div>
  );
}
