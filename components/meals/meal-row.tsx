"use client";

import { useState } from "react";
import { isAfter, parseISO, startOfDay } from "date-fns";
import { BookOpen, Check, ChefHat, MoreHorizontal, Pencil, RefreshCw, ShoppingCart, Trash2, UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/app/member-avatar";
import { useAppData } from "@/components/app/providers";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { cookMinutesLabel } from "@/components/meals/helpers";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useToast } from "@/hooks/use-toast";
import { firstName, paletteForMember } from "@/lib/member-colors";
import { moduleConfigs } from "@/lib/modules";
import type { MealPlan, Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MealRowProps {
  meal: MealPlan;
  recipe: Recipe | null;
  isParent: boolean;
  prominent?: boolean;
  onSwap: () => void;
  onOpenRecipe: (recipe: Recipe) => void;
}

export function MealRow({ meal, recipe, isParent, prominent, onSwap, onOpenRecipe }: MealRowProps) {
  const { updateRecord, deleteRecord, addIngredientsToGrocery } = useAppData();
  const { members, findMember } = useFamilyMembers();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);

  const cook = findMember(meal.cook_id);
  const palette = cook ? paletteForMember(cook, members) : null;
  const minutes = cookMinutesLabel(recipe);
  const mealDay = parseISO(meal.meal_date);
  const isTodayOrPast = !isAfter(startOfDay(mealDay), startOfDay(new Date()));
  const alreadyMarked = Boolean(recipe && recipe.last_cooked_on === meal.meal_date);
  const canMarkCooked = isParent && meal.meal_type === "Dinner" && isTodayOrPast && Boolean(recipe);

  async function sendIngredients() {
    if (!meal.ingredients) return;
    await addIngredientsToGrocery(meal.ingredients);
    toast({ title: "Sent to grocery", description: `Ingredients for ${meal.title} are on the list.`, variant: "success" });
  }

  async function markCooked() {
    if (!recipe) return;
    await updateRecord("recipes", recipe.id, { last_cooked_on: meal.meal_date });
    toast({ title: "Cooked it", description: `${recipe.title} is logged. Nice work${cook ? `, ${firstName(cook.display_name)}` : ""}.`, variant: "success" });
  }

  const emoji = recipe?.emoji ?? (meal.title.toLowerCase().includes("leftover") ? "🥡" : meal.title.toLowerCase().includes("eating out") ? "🍽️" : null);

  return (
    <>
      <div
        className={cn("record-tile flex min-w-0 items-center gap-2.5 border-l-4", prominent ? "min-h-16 p-3" : "min-h-11 px-2.5 py-1.5")}
        style={{ borderLeftColor: palette?.solid ?? "transparent" }}
      >
        {prominent ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl" aria-hidden>
            {emoji ?? "🍴"}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {!prominent ? <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{meal.meal_type}</p> : null}
          {recipe ? (
            <button type="button" onClick={() => onOpenRecipe(recipe)} className={cn("text-wrap-safe text-left font-semibold leading-snug hover:underline focus-ring rounded", prominent ? "text-sm" : "text-xs")}>
              {meal.title}
            </button>
          ) : (
            <p className={cn("text-wrap-safe font-semibold leading-snug", prominent ? "text-sm" : "text-xs")}>{meal.title}</p>
          )}
          {prominent ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {[cook ? `${firstName(cook.display_name)} is cooking` : null, minutes, alreadyMarked ? "Cooked" : null].filter(Boolean).join(" · ") || (isParent ? "Nobody assigned yet" : "Dinner")}
            </p>
          ) : null}
        </div>
        {cook ? <MemberAvatar member={cook} size={prominent ? "sm" : "xs"} /> : null}
        {canMarkCooked && prominent ? (
          <Button
            size="sm"
            variant={alreadyMarked ? "ghost" : "outline"}
            className="h-9 shrink-0 px-2.5"
            disabled={alreadyMarked}
            onClick={() => void markCooked()}
            aria-label={alreadyMarked ? "Already marked as cooked" : `Mark ${meal.title} as cooked`}
          >
            <Check className={cn("h-4 w-4", alreadyMarked && "text-emerald-600 dark:text-emerald-300")} />
            {alreadyMarked ? "Cooked" : "Cooked it"}
          </Button>
        ) : null}
        {isParent ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("shrink-0 rounded-full", prominent ? "h-10 w-10" : "h-9 w-9")} aria-label={`Options for ${meal.title}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ChefHat className="mr-2 h-4 w-4" />
                  Assign cook
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  <DropdownMenuLabel>Who is cooking?</DropdownMenuLabel>
                  {members.map((member) => (
                    <DropdownMenuItem key={member.id} onSelect={() => void updateRecord("meal_plans", meal.id, { cook_id: member.id })}>
                      <MemberAvatar member={member} size="xs" className="mr-2" />
                      {member.display_name}
                      {meal.cook_id === member.id ? <Check className="ml-auto h-4 w-4" /> : null}
                    </DropdownMenuItem>
                  ))}
                  {meal.cook_id ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => void updateRecord("meal_plans", meal.id, { cook_id: null })}>
                        <UserRoundX className="mr-2 h-4 w-4" />
                        Nobody yet
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {meal.ingredients ? (
                <DropdownMenuItem onSelect={() => void sendIngredients()}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Send ingredients to grocery
                </DropdownMenuItem>
              ) : null}
              {recipe ? (
                <DropdownMenuItem onSelect={() => onOpenRecipe(recipe)}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Open recipe
                </DropdownMenuItem>
              ) : null}
              {canMarkCooked && !prominent ? (
                <DropdownMenuItem onSelect={() => void markCooked()} disabled={alreadyMarked}>
                  <Check className="mr-2 h-4 w-4" />
                  {alreadyMarked ? "Marked cooked" : "Cooked it"}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={onSwap}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Swap
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void deleteRecord("meal_plans", meal.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <RecordFormDialog config={moduleConfigs.meals} record={meal} open={editing} onOpenChange={setEditing} />
    </>
  );
}
