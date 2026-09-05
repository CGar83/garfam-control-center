"use client";

import { useMemo, useState } from "react";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import { CalendarPlus, Check, Clock, ExternalLink, Heart, Pencil, ShoppingCart, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useAppData } from "@/components/app/providers";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { lastCookedLabel, splitIngredients, totalMinutes } from "@/components/recipes/helpers";
import { StarRating } from "@/components/recipes/star-rating";
import { useToast } from "@/hooks/use-toast";
import { moduleConfigs } from "@/lib/modules";
import { dateKey } from "@/lib/streaks";
import type { MealPlan, Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RecipeDetailDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecipeDetailDialog({ recipe, open, onOpenChange }: RecipeDetailDialogProps) {
  const { data, createRecord, updateRecord, deleteRecord, addIngredientsToGrocery, currentMember } = useAppData();
  const { toast } = useToast();
  const isParent = !currentMember || currentMember.role !== "viewer";

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [planning, setPlanning] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<{ date: Date; existing: MealPlan } | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sending, setSending] = useState(false);

  const ingredients = useMemo(() => splitIngredients(recipe?.ingredients), [recipe?.ingredients]);
  const nextDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(new Date(), index)), []);

  if (!recipe) return null;
  const total = totalMinutes(recipe);

  function dinnerOn(date: Date) {
    return data.meal_plans.find((meal) => meal.meal_type === "Dinner" && isSameDay(parseISO(meal.meal_date), date));
  }

  async function planFor(date: Date, existing?: MealPlan) {
    if (!recipe) return;
    const payload = {
      meal_date: dateKey(date),
      meal_type: "Dinner",
      title: recipe.title,
      recipe_id: recipe.id,
      recipe_url: recipe.source_url ?? null,
      ingredients: recipe.ingredients ?? null
    };
    if (existing) {
      await updateRecord("meal_plans", existing.id, payload);
    } else {
      await createRecord("meal_plans", { ...payload, notes: null, cook_id: null });
    }
    toast({ title: "On the plan", description: `${recipe.title} is dinner ${isSameDay(date, new Date()) ? "tonight" : format(date, "EEEE")}.`, variant: "success" });
    setPlanning(false);
    setReplaceTarget(null);
  }

  async function sendToGrocery() {
    if (!recipe?.ingredients) return;
    setSending(true);
    try {
      await addIngredientsToGrocery(recipe.ingredients);
      toast({ title: "Added to grocery", description: `${ingredients.length} ingredients for ${recipe.title}.`, variant: "success" });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-left">
            <div className="flex items-start gap-4 pr-8">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-muted text-4xl" aria-hidden>
                {recipe.emoji || "🍲"}
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-wrap-safe text-xl leading-tight">{recipe.title}</DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {recipe.cuisine ? <span>{recipe.cuisine}</span> : null}
                  {total ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {total} min
                    </span>
                  ) : null}
                  {recipe.servings ? (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      Serves {recipe.servings}
                    </span>
                  ) : null}
                </DialogDescription>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StarRating value={recipe.rating} size="sm" onChange={isParent ? (value) => void updateRecord("recipes", recipe.id, { rating: value }) : undefined} />
                  <Badge variant="outline">{recipe.meal_type}</Badge>
                  {recipe.kid_approved ? <Badge variant="info">Kid approved</Badge> : null}
                  {recipe.favorite ? <Badge variant="warning">Favorite</Badge> : null}
                  <span className="text-xs text-muted-foreground">{lastCookedLabel(recipe)}</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {isParent ? (
              <Button onClick={() => setPlanning((value) => !value)} aria-expanded={planning}>
                <CalendarPlus className="h-4 w-4" />
                Plan it
              </Button>
            ) : null}
            {recipe.ingredients ? (
              <Button variant="outline" onClick={() => void sendToGrocery()} disabled={sending}>
                <ShoppingCart className="h-4 w-4" />
                Add all to grocery
              </Button>
            ) : null}
            {isParent ? (
              <Button
                variant="outline"
                aria-pressed={recipe.favorite}
                onClick={() => void updateRecord("recipes", recipe.id, { favorite: !recipe.favorite })}
              >
                <Heart className={cn("h-4 w-4", recipe.favorite && "fill-primary text-primary")} />
                {recipe.favorite ? "Favorited" : "Favorite"}
              </Button>
            ) : null}
            {recipe.source_url ? (
              <Button variant="ghost" asChild>
                <a href={recipe.source_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Source
                </a>
              </Button>
            ) : null}
          </div>

          {planning ? (
            <div className="record-tile pop-in">
              <p className="text-sm font-semibold">Which night?</p>
              <p className="text-xs text-muted-foreground">Tap a day to make this dinner.</p>
              <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                {nextDays.map((date, index) => {
                  const existing = dinnerOn(date);
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => (existing && existing.recipe_id !== recipe.id ? setReplaceTarget({ date, existing }) : void planFor(date, existing))}
                      className={cn(
                        "flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-2xl border px-3 py-2 text-center transition-all active:scale-[0.97] focus-ring",
                        existing ? "border-border bg-muted/50" : "border-primary/40 bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{index === 0 ? "Today" : index === 1 ? "Tmrw" : format(date, "EEE")}</span>
                      <span className="text-lg font-semibold leading-none">{format(date, "d")}</span>
                      <span className="max-w-full truncate text-[10px] text-muted-foreground">{existing ? existing.title : "Open"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <section aria-label="Ingredients">
              <h3 className="text-sm font-semibold">Ingredients</h3>
              {ingredients.length ? (
                <ul className="mt-2 space-y-1">
                  {ingredients.map((ingredient, index) => {
                    const done = checked.has(index);
                    return (
                      <li key={`${ingredient}-${index}`}>
                        <button
                          type="button"
                          aria-pressed={done}
                          onClick={() =>
                            setChecked((prev) => {
                              const next = new Set(prev);
                              if (next.has(index)) next.delete(index);
                              else next.add(index);
                              return next;
                            })
                          }
                          className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2 text-left text-sm transition-colors hover:bg-muted/60 focus-ring"
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                              done ? "border-[#ACE1AF] bg-[#ACE1AF] text-[#235226]" : "border-border"
                            )}
                          >
                            {done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                          </span>
                          <span className={cn(done && "text-muted-foreground line-through")}>{ingredient}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No ingredients listed yet.</p>
              )}
            </section>
            <section aria-label="Instructions">
              <h3 className="text-sm font-semibold">Instructions</h3>
              {recipe.instructions ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-foreground/90">{recipe.instructions}</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No instructions yet. You know the drill.</p>
              )}
              {recipe.notes ? (
                <div className="mt-3 rounded-2xl bg-[#ACE1AF]/25 p-3 text-sm text-[#235226] dark:bg-[#ACE1AF]/10 dark:text-[#D7F2D9]">
                  <span className="font-semibold">Family note: </span>
                  {recipe.notes}
                </div>
              ) : null}
              {recipe.tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {recipe.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          {isParent ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-3">
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(true)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <RecordFormDialog config={moduleConfigs.recipes} record={recipe} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete "${recipe.title}"?`}
        description="It comes off the recipe box. Meals already planned with it stay on the calendar."
        confirmLabel="Delete recipe"
        onConfirm={async () => {
          await deleteRecord("recipes", recipe.id);
          toast({ title: "Recipe deleted", description: `${recipe.title} is out of the box.` });
          onOpenChange(false);
        }}
      />
      <ConfirmDialog
        open={Boolean(replaceTarget)}
        onOpenChange={(value) => !value && setReplaceTarget(null)}
        title={`Replace ${replaceTarget ? format(replaceTarget.date, "EEEE") : ""}'s dinner?`}
        description={replaceTarget ? `${replaceTarget.existing.title} is already planned. Swap it for ${recipe.title}?` : ""}
        confirmLabel="Swap it"
        onConfirm={() => (replaceTarget ? planFor(replaceTarget.date, replaceTarget.existing) : undefined)}
      />
    </>
  );
}
