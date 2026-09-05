"use client";

import { BookOpen, Plus, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/app/member-avatar";
import { cookMinutesLabel } from "@/components/meals/helpers";
import { firstName } from "@/lib/member-colors";
import type { FamilyMember, MealPlan, Recipe } from "@/lib/types";

interface TonightCardProps {
  meal: MealPlan | null;
  recipe: Recipe | null;
  cook: FamilyMember | null | undefined;
  isParent: boolean;
  hasRecipes: boolean;
  busy?: boolean;
  onPlan: () => void;
  onPickForMe: () => void;
  onOpenRecipe: (recipe: Recipe) => void;
  onAddIngredients: () => void;
}

export function TonightCard({ meal, recipe, cook, isParent, hasRecipes, busy, onPlan, onPickForMe, onOpenRecipe, onAddIngredients }: TonightCardProps) {
  const minutes = cookMinutesLabel(recipe);
  const details = meal ? [cook ? `${firstName(cook.display_name)} is cooking` : null, minutes].filter(Boolean).join(" · ") : "";

  return (
    <section className="hero-card fade-up p-5 sm:p-6" aria-label="Tonight's dinner">
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white/20 text-3xl backdrop-blur-sm" aria-hidden>
            {meal ? recipe?.emoji ?? "🍴" : "🌙"}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Tonight</p>
            <h2 className="text-wrap-safe text-xl font-semibold leading-tight sm:text-2xl">{meal ? meal.title : "Tonight is open"}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-white/85">
              {cook ? <MemberAvatar member={cook} size="xs" ring /> : null}
              {meal ? details || (isParent ? "Nobody is assigned yet." : "Dinner is planned.") : isParent ? "Pick something from the recipe box or let us choose." : "Nothing planned yet. Ask a parent what is for dinner."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {meal ? (
            <>
              {recipe ? (
                <Button variant="secondary" className="bg-white text-zinc-900 hover:bg-white/90" onClick={() => onOpenRecipe(recipe)}>
                  <BookOpen className="h-4 w-4" />
                  Open recipe
                </Button>
              ) : null}
              {meal.ingredients ? (
                <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 dark:bg-white/10" onClick={onAddIngredients} disabled={busy}>
                  <ShoppingCart className="h-4 w-4" />
                  Add ingredients to grocery
                </Button>
              ) : null}
            </>
          ) : isParent ? (
            <>
              <Button variant="secondary" className="bg-white text-zinc-900 hover:bg-white/90" onClick={onPlan}>
                <Plus className="h-4 w-4" />
                Plan dinner
              </Button>
              {hasRecipes ? (
                <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 dark:bg-white/10" onClick={onPickForMe} disabled={busy}>
                  <Sparkles className="h-4 w-4" />
                  Pick for me
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
