import { addDays, addWeeks, differenceInCalendarDays, isValid, parseISO, startOfWeek } from "date-fns";
import { notCookedRecently } from "@/components/recipes/helpers";
import { dateKey } from "@/lib/streaks";
import type { MealPlan, Recipe } from "@/lib/types";

export const mealOrder = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
export type MealType = (typeof mealOrder)[number];

export function weekDaysFor(offset: number, today = new Date()) {
  const start = startOfWeek(addWeeks(today, offset));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function mealsOn(plans: MealPlan[], date: Date) {
  const key = dateKey(date);
  return plans.filter((meal) => meal.meal_date === key).sort((a, b) => mealOrder.indexOf(a.meal_type as MealType) - mealOrder.indexOf(b.meal_type as MealType));
}

export function mealFor(plans: MealPlan[], date: Date, type: MealType) {
  const key = dateKey(date);
  return plans.find((meal) => meal.meal_date === key && meal.meal_type === type) ?? null;
}

export function plansInWeek(plans: MealPlan[], days: Date[]) {
  const keys = new Set(days.map(dateKey));
  return plans.filter((meal) => keys.has(meal.meal_date));
}

/** Splits comma-separated ingredient strings and dedupes case-insensitively, keeping the first spelling. */
export function dedupeIngredients(sources: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const source of sources) {
    for (const raw of (source ?? "").split(/,|\n/)) {
      const item = raw.trim();
      if (!item) continue;
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function cookedWithinDays(recipe: Recipe, days: number, today: Date) {
  if (!recipe.last_cooked_on) return false;
  const parsed = parseISO(recipe.last_cooked_on);
  if (!isValid(parsed)) return false;
  return differenceInCalendarDays(today, parsed) <= days;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/**
 * Picks a recipe for each open dinner slot. Prefers favorites and kid-approved recipes,
 * avoids repeats within the week and anything cooked in the last 7 days.
 */
export function pickDinners(recipes: Recipe[], weekPlans: MealPlan[], openDates: Date[], today = new Date()) {
  const alreadyPlanned = new Set(weekPlans.map((meal) => meal.recipe_id).filter(Boolean));
  const plannedTitles = new Set(weekPlans.map((meal) => meal.title.trim().toLowerCase()));

  const eligible = recipes.filter(
    (recipe) =>
      recipe.meal_type === "Dinner" &&
      !alreadyPlanned.has(recipe.id) &&
      !plannedTitles.has(recipe.title.trim().toLowerCase()) &&
      !cookedWithinDays(recipe, 7, today)
  );

  const score = (recipe: Recipe) => (recipe.favorite ? 2 : 0) + (recipe.kid_approved ? 2 : 0) + (notCookedRecently(recipe, 14, today) ? 1 : 0) + (recipe.rating ?? 0) / 10;
  const ranked = shuffle(eligible).sort((a, b) => score(b) - score(a));

  const picks: Array<{ date: Date; recipe: Recipe }> = [];
  openDates.forEach((date, index) => {
    const recipe = ranked[index];
    if (recipe) picks.push({ date, recipe });
  });
  return picks;
}

export function cookMinutesLabel(recipe: Pick<Recipe, "prep_minutes" | "cook_minutes"> | null | undefined) {
  if (!recipe) return null;
  const total = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  return total > 0 ? `${total} min` : null;
}
