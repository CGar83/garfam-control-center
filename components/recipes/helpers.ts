import { differenceInCalendarDays, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import type { MealPlan, Recipe } from "@/lib/types";

export type RecipeFilter = "all" | "favorites" | "kid" | "quick" | "Breakfast" | "Lunch" | "Dinner";
export type RecipeSort = "recent" | "alpha" | "rating";

export const recipeFilters: { id: RecipeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "kid", label: "Kid approved" },
  { id: "quick", label: "Quick" },
  { id: "Breakfast", label: "Breakfast" },
  { id: "Lunch", label: "Lunch" },
  { id: "Dinner", label: "Dinner" }
];

export const recipeSorts: { id: RecipeSort; label: string }[] = [
  { id: "recent", label: "Recently cooked" },
  { id: "alpha", label: "A to Z" },
  { id: "rating", label: "Rating" }
];

export const QUICK_MINUTES = 30;
export const RECENT_DAYS = 14;

export function totalMinutes(recipe: Pick<Recipe, "prep_minutes" | "cook_minutes">) {
  const total = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  return total > 0 ? total : null;
}

export function isQuick(recipe: Recipe) {
  const total = totalMinutes(recipe);
  return total !== null && total <= QUICK_MINUTES;
}

export function daysSinceCooked(recipe: Pick<Recipe, "last_cooked_on">, today = new Date()) {
  if (!recipe.last_cooked_on) return null;
  const parsed = parseISO(recipe.last_cooked_on);
  if (!isValid(parsed)) return null;
  return differenceInCalendarDays(today, parsed);
}

export function notCookedRecently(recipe: Recipe, days = RECENT_DAYS, today = new Date()) {
  const since = daysSinceCooked(recipe, today);
  return since === null || since > days;
}

export function lastCookedLabel(recipe: Pick<Recipe, "last_cooked_on">) {
  if (!recipe.last_cooked_on) return "Never cooked";
  const parsed = parseISO(recipe.last_cooked_on);
  if (!isValid(parsed)) return "Never cooked";
  const days = differenceInCalendarDays(new Date(), parsed);
  if (days <= 0) return "Cooked today";
  if (days === 1) return "Cooked yesterday";
  return `Last cooked ${formatDistanceToNowStrict(parsed, { unit: days < 60 ? "day" : undefined })} ago`;
}

export function recipeMeta(recipe: Recipe) {
  const total = totalMinutes(recipe);
  return [recipe.cuisine, total ? `${total} min` : null, recipe.servings ? `Serves ${recipe.servings}` : null].filter(Boolean).join(" · ");
}

export function splitIngredients(ingredients?: string | null) {
  return (ingredients ?? "")
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function matchesRecipeFilter(recipe: Recipe, filter: RecipeFilter) {
  switch (filter) {
    case "all":
      return true;
    case "favorites":
      return recipe.favorite;
    case "kid":
      return recipe.kid_approved;
    case "quick":
      return isQuick(recipe);
    default:
      return recipe.meal_type === filter;
  }
}

export function matchesRecipeQuery(recipe: Recipe, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [recipe.title, recipe.cuisine, recipe.meal_type, recipe.ingredients, recipe.notes, ...(recipe.tags ?? [])].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(normalized);
}

export function sortRecipes(recipes: Recipe[], sort: RecipeSort) {
  const copy = [...recipes];
  if (sort === "alpha") return copy.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "rating") return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.title.localeCompare(b.title));
  return copy.sort((a, b) => (b.last_cooked_on ?? "").localeCompare(a.last_cooked_on ?? "") || a.title.localeCompare(b.title));
}

export function mostCookedCuisine(recipes: Recipe[], mealPlans: MealPlan[]) {
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const counts = new Map<string, number>();
  for (const plan of mealPlans) {
    const recipe = plan.recipe_id ? byId.get(plan.recipe_id) : undefined;
    if (recipe?.cuisine) counts.set(recipe.cuisine, (counts.get(recipe.cuisine) ?? 0) + 1);
  }
  if (counts.size === 0) {
    for (const recipe of recipes) {
      if (recipe.cuisine && recipe.last_cooked_on) counts.set(recipe.cuisine, (counts.get(recipe.cuisine) ?? 0) + 1);
    }
  }
  if (counts.size === 0) {
    for (const recipe of recipes) {
      if (recipe.cuisine) counts.set(recipe.cuisine, (counts.get(recipe.cuisine) ?? 0) + 1);
    }
  }
  let best: { cuisine: string; count: number } | null = null;
  for (const [cuisine, count] of counts) {
    if (!best || count > best.count) best = { cuisine, count };
  }
  return best;
}

export type StarterRecipe = Omit<Recipe, "id" | "family_id" | "created_at" | "updated_at">;

export const starterRecipes: StarterRecipe[] = [
  {
    title: "Sheet-pan chicken and veggies",
    emoji: "🍋",
    cuisine: "American",
    meal_type: "Dinner",
    prep_minutes: 10,
    cook_minutes: 30,
    servings: 4,
    ingredients: "Chicken thighs, baby potatoes, broccoli, olive oil, garlic, lemon, salt, pepper",
    instructions: "Toss everything with oil and seasoning on one pan. Roast at 425°F for 30 minutes.",
    source_url: null,
    tags: ["weeknight", "one pan"],
    favorite: false,
    kid_approved: true,
    last_cooked_on: null,
    rating: null,
    notes: null
  },
  {
    title: "Taco night",
    emoji: "🌮",
    cuisine: "Mexican",
    meal_type: "Dinner",
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 4,
    ingredients: "Ground beef or turkey, taco seasoning, tortillas, shredded cheese, lettuce, tomatoes, sour cream, salsa",
    instructions: "Brown the meat with seasoning. Warm tortillas. Let everyone build their own.",
    source_url: null,
    tags: ["kid favorite", "fast"],
    favorite: false,
    kid_approved: true,
    last_cooked_on: null,
    rating: null,
    notes: null
  },
  {
    title: "Spaghetti and meatballs",
    emoji: "🍝",
    cuisine: "Italian",
    meal_type: "Dinner",
    prep_minutes: 10,
    cook_minutes: 25,
    servings: 6,
    ingredients: "Spaghetti, frozen meatballs, marinara, parmesan, garlic bread, salad greens",
    instructions: "Simmer meatballs in sauce while the pasta cooks. Serve with garlic bread and a quick salad.",
    source_url: null,
    tags: ["comfort", "leftovers"],
    favorite: false,
    kid_approved: true,
    last_cooked_on: null,
    rating: null,
    notes: null
  },
  {
    title: "Breakfast-for-dinner pancakes",
    emoji: "🥞",
    cuisine: "American",
    meal_type: "Dinner",
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 4,
    ingredients: "Pancake mix, eggs, milk, butter, maple syrup, bananas, bacon or sausage",
    instructions: "Mix batter, cook on a medium griddle, and fry bacon alongside. Kids can flip with help.",
    source_url: null,
    tags: ["fun", "kids cook"],
    favorite: false,
    kid_approved: true,
    last_cooked_on: null,
    rating: null,
    notes: null
  },
  {
    title: "Chicken fried rice",
    emoji: "🥢",
    cuisine: "Asian",
    meal_type: "Dinner",
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 4,
    ingredients: "Cooked rice, chicken breast, eggs, frozen peas and carrots, soy sauce, green onions, sesame oil",
    instructions: "Scramble eggs, sear chicken, then stir-fry with rice and veggies. Finish with soy sauce and sesame oil.",
    source_url: null,
    tags: ["fast", "leftovers"],
    favorite: false,
    kid_approved: true,
    last_cooked_on: null,
    rating: null,
    notes: null
  }
];
