"use client";

import { format, isSameDay } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MealRow } from "@/components/meals/meal-row";
import type { MealType } from "@/components/meals/helpers";
import type { MealPlan, Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DayCardProps {
  date: Date;
  meals: MealPlan[];
  recipesById: Map<string, Recipe>;
  isParent: boolean;
  onPlan: (date: Date, type: MealType) => void;
  onSwap: (meal: MealPlan) => void;
  onOpenRecipe: (recipe: Recipe) => void;
}

const otherTypes: MealType[] = ["Breakfast", "Lunch", "Snack"];

export function DayCard({ date, meals, recipesById, isParent, onPlan, onSwap, onOpenRecipe }: DayCardProps) {
  const today = isSameDay(date, new Date());
  const dinner = meals.find((meal) => meal.meal_type === "Dinner") ?? null;
  const others = meals.filter((meal) => meal.meal_type !== "Dinner");
  const missingTypes = otherTypes.filter((type) => !meals.some((meal) => meal.meal_type === type));

  return (
    <section
      className={cn("surface-panel flex min-w-0 flex-col gap-2.5 p-3 transition-all", today && "border-primary/50 ring-2 ring-primary/20")}
      aria-label={format(date, "EEEE, MMMM d")}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="flex items-baseline gap-1.5">
          <span className={cn("text-xs font-semibold uppercase tracking-wide", today ? "text-primary" : "text-muted-foreground")}>{today ? "Today" : format(date, "EEE")}</span>
          <span className="text-lg font-semibold leading-none">{format(date, "d")}</span>
        </h3>
        {isParent && missingTypes.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground" aria-label={`Add another meal on ${format(date, "EEEE")}`}>
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {missingTypes.map((type) => (
                <DropdownMenuItem key={type} onSelect={() => onPlan(date, type)}>
                  Add {type.toLowerCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <div className="min-w-0">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Dinner</p>
        {dinner ? (
          <MealRow meal={dinner} recipe={dinner.recipe_id ? recipesById.get(dinner.recipe_id) ?? null : null} isParent={isParent} prominent onSwap={() => onSwap(dinner)} onOpenRecipe={onOpenRecipe} />
        ) : isParent ? (
          <button
            type="button"
            onClick={() => onPlan(date, "Dinner")}
            className="flex min-h-16 w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border/80 text-sm font-medium text-muted-foreground transition-all hover:border-primary/60 hover:bg-primary/5 hover:text-primary active:scale-[0.98] focus-ring"
          >
            <Plus className="h-4 w-4" />
            Plan dinner
          </button>
        ) : (
          <p className="flex min-h-16 items-center justify-center rounded-2xl border-2 border-dashed border-border/60 text-sm text-muted-foreground">Nothing planned yet</p>
        )}
      </div>

      {others.length ? (
        <div className="space-y-1.5">
          {others.map((meal) => (
            <MealRow key={meal.id} meal={meal} recipe={meal.recipe_id ? recipesById.get(meal.recipe_id) ?? null : null} isParent={isParent} onSwap={() => onSwap(meal)} onOpenRecipe={onOpenRecipe} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
