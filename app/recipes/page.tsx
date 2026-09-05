"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChefHat, Heart, Plus, Search, Smile, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { useAppData } from "@/components/app/providers";
import { StatCard } from "@/components/app/stat-card";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import {
  matchesRecipeFilter,
  matchesRecipeQuery,
  mostCookedCuisine,
  recipeFilters,
  recipeSorts,
  sortRecipes,
  starterRecipes,
  type RecipeFilter,
  type RecipeSort,
  type StarterRecipe
} from "@/components/recipes/helpers";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { RecipeDetailDialog } from "@/components/recipes/recipe-detail-dialog";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { useToast } from "@/hooks/use-toast";
import { moduleConfigs } from "@/lib/modules";
import { cn } from "@/lib/utils";

export default function RecipesPage() {
  const { data, createRecord, updateRecord, currentMember } = useAppData();
  const { toast } = useToast();
  const recipes = useRealtimeTable("recipes");
  const isParent = !currentMember || currentMember.role !== "viewer";

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RecipeFilter>("all");
  const [sort, setSort] = useState<RecipeSort>("recent");
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [addingStarter, setAddingStarter] = useState<string | null>(null);

  const visible = useMemo(
    () => sortRecipes(recipes.filter((recipe) => matchesRecipeFilter(recipe, filter) && matchesRecipeQuery(recipe, query)), sort),
    [filter, query, recipes, sort]
  );
  const favorites = recipes.filter((recipe) => recipe.favorite).length;
  const kidApproved = recipes.filter((recipe) => recipe.kid_approved).length;
  const topCuisine = useMemo(() => mostCookedCuisine(recipes, data.meal_plans), [data.meal_plans, recipes]);
  const openRecipe = recipes.find((recipe) => recipe.id === openId) ?? null;

  async function addStarter(starter: StarterRecipe) {
    setAddingStarter(starter.title);
    try {
      await createRecord("recipes", starter);
      toast({ title: `${starter.emoji} ${starter.title} saved`, description: "It is in the recipe box and ready to plan.", variant: "success" });
    } finally {
      setAddingStarter(null);
    }
  }

  async function addAllStarters() {
    setAddingStarter("all");
    try {
      await Promise.all(starterRecipes.map((starter) => createRecord("recipes", starter)));
      toast({ title: "Five dinners saved", description: "Meal planning just got a lot easier.", variant: "success" });
    } finally {
      setAddingStarter(null);
    }
  }

  return (
    <div className="app-page">
      <PageHeader
        title="Recipe Box"
        description="The meals your family actually eats, ready to drop onto the week and the grocery list."
        action={
          isParent ? (
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              Add recipe
            </Button>
          ) : undefined
        }
      />

      {recipes.length === 0 ? (
        <div className="app-section fade-up">
          <EmptyState
            title="No recipes yet"
            description={isParent ? "Save the five dinners you make on repeat. Meal planning gets easy fast." : "Ask a parent to add the family favorites and they will show up here."}
            action={
              isParent ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => setAdding(true)}>
                    <Plus className="h-4 w-4" />
                    Add recipe
                  </Button>
                  <Button variant="outline" onClick={() => void addAllStarters()} disabled={Boolean(addingStarter)}>
                    <Sparkles className="h-4 w-4" />
                    Add all five starters
                  </Button>
                </div>
              ) : undefined
            }
          />
          {isParent ? (
            <section className="min-w-0">
              <h2 className="text-base font-semibold">Starter recipes</h2>
              <p className="text-sm text-muted-foreground">Simple, family-friendly dinners. Tap to save one.</p>
              <div className="mt-3 grid-auto-fit-sm">
                {starterRecipes.map((starter) => (
                  <div key={starter.title} className="record-tile flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl" aria-hidden>
                      {starter.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{starter.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {starter.cuisine} · {(starter.prep_minutes ?? 0) + (starter.cook_minutes ?? 0)} min
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void addStarter(starter)} disabled={Boolean(addingStarter)} aria-label={`Add ${starter.title}`}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid-auto-fit-sm fade-up">
            <StatCard label="Recipes" value={recipes.length} icon={<BookOpen className="h-5 w-5" />} />
            <StatCard label="Favorites" value={favorites} icon={<Heart className="h-5 w-5" />} tone="red" />
            <StatCard label="Kid approved" value={kidApproved} icon={<Smile className="h-5 w-5" />} tone="sage" helper={recipes.length ? `${Math.round((kidApproved / recipes.length) * 100)}% of the box` : undefined} />
            <StatCard label="Most cooked cuisine" value={topCuisine?.cuisine ?? "Not yet"} icon={<ChefHat className="h-5 w-5" />} tone="yellow" helper={topCuisine ? `${topCuisine.count} ${topCuisine.count === 1 ? "time" : "times"} on the plan` : "Plan a few dinners to find out"} />
          </div>

          <div className="surface-panel fade-up fade-up-delay-1 flex min-w-0 flex-col gap-3 p-3 sm:p-4">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Search recipes" placeholder="Search recipes, ingredients, tags…" value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 pl-9 text-base" />
              </div>
              <Select value={sort} onValueChange={(value) => setSort(value as RecipeSort)}>
                <SelectTrigger className="h-11 sm:w-48" aria-label="Sort recipes">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {recipeSorts.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="Filter recipes">
              {recipeFilters.map((option) => {
                const active = filter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(option.id)}
                    className={cn(
                      "h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold transition-all focus-ring",
                      active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-white/70 text-muted-foreground hover:border-primary/40 dark:bg-white/5"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {visible.length ? (
            <div className="grid-auto-fit fade-up fade-up-delay-2">
              {visible.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  canManage={isParent}
                  onOpen={() => setOpenId(recipe.id)}
                  onToggleFavorite={() => void updateRecord("recipes", recipe.id, { favorite: !recipe.favorite })}
                  onRate={(value) => void updateRecord("recipes", recipe.id, { rating: value })}
                />
              ))}
            </div>
          ) : (
            <div className="fade-up fade-up-delay-2">
              <EmptyState
                title="Nothing matches"
                description="Try a different filter or search term."
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            </div>
          )}
        </>
      )}

      <RecordFormDialog config={moduleConfigs.recipes} open={adding} onOpenChange={setAdding} />
      <RecipeDetailDialog recipe={openRecipe} open={Boolean(openRecipe)} onOpenChange={(open) => !open && setOpenId(null)} />
    </div>
  );
}
