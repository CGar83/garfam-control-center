"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowRight, Heart, Search, Smile, Timer, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MealType } from "@/components/meals/helpers";
import { isQuick, lastCookedLabel, matchesRecipeQuery, notCookedRecently, recipeMeta } from "@/components/recipes/helpers";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface PickerChoice {
  title: string;
  recipe: Recipe | null;
}

type Chip = "favorites" | "kid" | "quick" | "fresh";

const chips: { id: Chip; label: string; icon: typeof Heart }[] = [
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "kid", label: "Kid approved", icon: Smile },
  { id: "quick", label: "Quick", icon: Timer },
  { id: "fresh", label: "Not cooked recently", icon: Utensils }
];

const shortcuts = [
  { title: "Eating out", emoji: "🍽️" },
  { title: "Leftovers", emoji: "🥡" }
];

interface RecipePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
  date: Date | null;
  mealType: MealType;
  mode?: "create" | "swap";
  currentTitle?: string | null;
  onChoose: (choice: PickerChoice) => void | Promise<void>;
}

export function RecipePickerDialog({ open, onOpenChange, recipes, date, mealType, mode = "create", currentTitle, onChoose }: RecipePickerDialogProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<Chip>>(new Set());
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCustom("");
      setActive(new Set());
      setBusy(false);
    }
  }, [open]);

  const visible = useMemo(() => {
    const relevant = recipes.filter((recipe) => (mealType === "Dinner" ? recipe.meal_type === "Dinner" || recipe.meal_type === "Side" : recipe.meal_type === mealType));
    const pool = relevant.length ? relevant : recipes;
    return pool
      .filter((recipe) => matchesRecipeQuery(recipe, query))
      .filter((recipe) => !active.has("favorites") || recipe.favorite)
      .filter((recipe) => !active.has("kid") || recipe.kid_approved)
      .filter((recipe) => !active.has("quick") || isQuick(recipe))
      .filter((recipe) => !active.has("fresh") || notCookedRecently(recipe))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title));
  }, [active, mealType, query, recipes]);

  async function choose(choice: PickerChoice) {
    if (busy) return;
    setBusy(true);
    try {
      await onChoose(choice);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  function toggleChip(chip: Chip) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  }

  const dayLabel = date ? format(date, "EEEE, MMM d") : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="text-left">
          <DialogTitle>{mode === "swap" ? `Swap ${mealType.toLowerCase()}` : `Plan ${mealType.toLowerCase()}`}</DialogTitle>
          <DialogDescription>
            {dayLabel}
            {mode === "swap" && currentTitle ? ` · replacing ${currentTitle}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search recipes" placeholder="Search the recipe box…" value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 pl-9 text-base" autoFocus />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="Filter recipes">
          {chips.map((chip) => {
            const Icon = chip.icon;
            const on = active.has(chip.id);
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleChip(chip.id)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all focus-ring",
                  on ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-white/70 text-muted-foreground hover:border-primary/40 dark:bg-white/5"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className="max-h-[38vh] space-y-1.5 overflow-y-auto pr-1">
          {visible.length ? (
            visible.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                disabled={busy}
                onClick={() => void choose({ title: recipe.title, recipe })}
                className="record-tile flex min-h-14 w-full items-center gap-3 text-left transition-all hover:border-primary/50 hover:bg-white active:scale-[0.99] focus-ring disabled:opacity-60 dark:hover:bg-white/10"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl" aria-hidden>
                  {recipe.emoji || "🍲"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold">{recipe.title}</span>
                    {recipe.favorite ? <Heart className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" aria-label="Favorite" /> : null}
                    {recipe.kid_approved ? (
                      <Badge variant="info" className="hidden shrink-0 sm:inline-flex">
                        Kid approved
                      </Badge>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[recipeMeta(recipe), lastCookedLabel(recipe)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-border/80 p-5 text-center text-sm text-muted-foreground">
              {recipes.length ? "No recipes match. Try clearing a filter or type your own below." : "The recipe box is empty. Type a meal below or add recipes first."}
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-border/70 pt-3">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (custom.trim()) void choose({ title: custom.trim(), recipe: null });
            }}
          >
            <Input aria-label="Type your own meal" placeholder="Type your own, like Grilled cheese night" value={custom} onChange={(event) => setCustom(event.target.value)} className="h-11 text-base" />
            <Button type="submit" className="h-11 shrink-0" disabled={!custom.trim() || busy}>
              Add
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {shortcuts.map((shortcut) => (
              <Button key={shortcut.title} type="button" variant="outline" size="sm" disabled={busy} onClick={() => void choose({ title: shortcut.title, recipe: null })}>
                <span aria-hidden>{shortcut.emoji}</span>
                {shortcut.title}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
