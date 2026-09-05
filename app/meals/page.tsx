"use client";

import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { useAppData } from "@/components/app/providers";
import { DayCard } from "@/components/meals/day-card";
import { dedupeIngredients, mealFor, mealsOn, pickDinners, plansInWeek, weekDaysFor, type MealType } from "@/components/meals/helpers";
import { RecipePickerDialog, type PickerChoice } from "@/components/meals/recipe-picker-dialog";
import { TonightCard } from "@/components/meals/tonight-card";
import { RecipeDetailDialog } from "@/components/recipes/recipe-detail-dialog";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { useToast } from "@/hooks/use-toast";
import { dateKey } from "@/lib/streaks";
import type { MealPlan } from "@/lib/types";

interface PickerState {
  date: Date;
  mealType: MealType;
  swapping: MealPlan | null;
}

export default function MealsPage() {
  const { createRecord, updateRecord, addIngredientsToGrocery, currentMember } = useAppData();
  const { findMember } = useFamilyMembers();
  const { toast } = useToast();
  const mealPlans = useRealtimeTable("meal_plans");
  const recipes = useRealtimeTable("recipes");
  const isParent = !currentMember || currentMember.role !== "viewer";

  const [offset, setOffset] = useState(0);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const today = new Date();
  const days = useMemo(() => weekDaysFor(offset), [offset]);
  const weekPlans = useMemo(() => plansInWeek(mealPlans, days), [days, mealPlans]);
  const recipesById = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);
  const tonight = mealFor(mealPlans, today, "Dinner");
  const tonightRecipe = tonight?.recipe_id ? recipesById.get(tonight.recipe_id) ?? null : null;
  const openRecipe = openRecipeId ? recipesById.get(openRecipeId) ?? null : null;
  const openDinnerDays = days.filter((day) => !mealFor(weekPlans, day, "Dinner"));
  const rangeLabel = `${format(days[0], "MMM d")} – ${format(days[6], days[0].getMonth() === days[6].getMonth() ? "d" : "MMM d")}`;

  function mealPayload(date: Date, mealType: MealType, choice: PickerChoice) {
    return {
      meal_date: dateKey(date),
      meal_type: mealType,
      title: choice.title,
      recipe_id: choice.recipe?.id ?? null,
      recipe_url: choice.recipe?.source_url ?? null,
      ingredients: choice.recipe?.ingredients ?? null
    };
  }

  async function handleChoice(choice: PickerChoice) {
    if (!picker) return;
    const payload = mealPayload(picker.date, picker.mealType, choice);
    if (picker.swapping) {
      await updateRecord("meal_plans", picker.swapping.id, payload);
      toast({ title: "Swapped", description: `${choice.title} replaces ${picker.swapping.title}.`, variant: "success" });
    } else {
      await createRecord("meal_plans", { ...payload, notes: null, cook_id: null });
      toast({ title: "Planned", description: `${choice.title} for ${picker.mealType.toLowerCase()} on ${isSameDay(picker.date, today) ? "tonight" : format(picker.date, "EEEE")}.`, variant: "success" });
    }
  }

  async function pickForMe(dates: Date[], contextPlans: MealPlan[] = weekPlans) {
    if (busy) return;
    if (dates.length === 0) {
      toast({ title: "Week is full", description: "Every dinner this week already has a plan." });
      return;
    }
    setBusy(true);
    try {
      const picks = pickDinners(recipes, contextPlans, dates);
      if (picks.length === 0) {
        toast({ title: "Nothing to pick", description: "Add a few dinner recipes to the recipe box first.", variant: "destructive" });
        return;
      }
      await Promise.all(
        picks.map(({ date, recipe }) =>
          createRecord("meal_plans", { ...mealPayload(date, "Dinner", { title: recipe.title, recipe }), notes: null, cook_id: null })
        )
      );
      const names = picks.map((pick) => pick.recipe.title);
      const summary = names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
      toast({
        title: picks.length === 1 ? "Dinner picked" : `${picks.length} dinners picked`,
        description: picks.length < dates.length ? `${summary}. ${dates.length - picks.length} ${dates.length - picks.length === 1 ? "night" : "nights"} left open so nothing repeats.` : summary,
        variant: "success"
      });
    } finally {
      setBusy(false);
    }
  }

  async function sendWeekToGrocery() {
    if (busy) return;
    const ingredients = dedupeIngredients(weekPlans.map((meal) => meal.ingredients));
    if (ingredients.length === 0) {
      toast({ title: "Nothing to send", description: "None of this week's meals have ingredients listed." });
      return;
    }
    setBusy(true);
    try {
      await addIngredientsToGrocery(ingredients.join(", "));
      toast({ title: "Grocery list updated", description: `${ingredients.length} ingredients added for ${weekPlans.length} ${weekPlans.length === 1 ? "meal" : "meals"}.`, variant: "success" });
    } finally {
      setBusy(false);
    }
  }

  async function addTonightIngredients() {
    if (!tonight?.ingredients || busy) return;
    setBusy(true);
    try {
      await addIngredientsToGrocery(tonight.ingredients);
      toast({ title: "Added to grocery", description: `Ingredients for ${tonight.title} are on the list.`, variant: "success" });
    } finally {
      setBusy(false);
    }
  }

  const noPlansAtAll = mealPlans.length === 0;

  return (
    <div className="app-page">
      <PageHeader
        title="Meal Plan"
        description="Dinner decided before anyone asks. Pull from the recipe box, assign a cook, and send the week to the grocery list."
        action={
          isParent ? (
            <Button onClick={() => void pickForMe(openDinnerDays)} disabled={busy || recipes.length === 0}>
              <Sparkles className="h-4 w-4" />
              Pick for me
            </Button>
          ) : undefined
        }
        secondaryAction={
          isParent ? (
            <Button variant="outline" onClick={() => void sendWeekToGrocery()} disabled={busy || weekPlans.length === 0}>
              <ShoppingCart className="h-4 w-4" />
              Send week to grocery
            </Button>
          ) : undefined
        }
      />

      <TonightCard
        meal={tonight}
        recipe={tonightRecipe}
        cook={findMember(tonight?.cook_id)}
        isParent={isParent}
        hasRecipes={recipes.length > 0}
        busy={busy}
        onPlan={() => setPicker({ date: today, mealType: "Dinner", swapping: null })}
        onPickForMe={() => void pickForMe([today], plansInWeek(mealPlans, weekDaysFor(0)))}
        onOpenRecipe={(recipe) => setOpenRecipeId(recipe.id)}
        onAddIngredients={() => void addTonightIngredients()}
      />

      <section className="app-section fade-up fade-up-delay-1 min-w-0" aria-label="Week planner">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => setOffset((value) => value - 1)} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant={offset === 0 ? "secondary" : "outline"} className="h-10" onClick={() => setOffset(0)} disabled={offset === 0}>
              <CalendarDays className="h-4 w-4" />
              This week
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => setOffset((value) => value + 1)} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-wrap-safe text-right text-sm font-semibold text-muted-foreground">
            {rangeLabel}
            {offset === 1 ? " · Next week" : offset === -1 ? " · Last week" : ""}
          </p>
        </div>

        {noPlansAtAll && !isParent ? (
          <EmptyState title="No meals planned" description="Nothing on the plan yet. Ask a parent what is for dinner this week." />
        ) : (
          <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {days.map((day) => (
              <DayCard
                key={day.toISOString()}
                date={day}
                meals={mealsOn(weekPlans, day)}
                recipesById={recipesById}
                isParent={isParent}
                onPlan={(date, type) => setPicker({ date, mealType: type, swapping: null })}
                onSwap={(meal) => setPicker({ date: new Date(`${meal.meal_date}T12:00:00`), mealType: meal.meal_type as MealType, swapping: meal })}
                onOpenRecipe={(recipe) => setOpenRecipeId(recipe.id)}
              />
            ))}
          </div>
        )}

        {isParent && weekPlans.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            {recipes.length ? "An empty week. Tap a dinner slot, or let Pick for me fill it in seconds." : "Add a few recipes to the recipe box and Pick for me can plan the week for you."}
          </p>
        ) : null}
      </section>

      <RecipePickerDialog
        open={Boolean(picker)}
        onOpenChange={(open) => !open && setPicker(null)}
        recipes={recipes}
        date={picker?.date ?? null}
        mealType={picker?.mealType ?? "Dinner"}
        mode={picker?.swapping ? "swap" : "create"}
        currentTitle={picker?.swapping?.title}
        onChoose={handleChoice}
      />
      <RecipeDetailDialog recipe={openRecipe} open={Boolean(openRecipe)} onOpenChange={(open) => !open && setOpenRecipeId(null)} />
    </div>
  );
}
