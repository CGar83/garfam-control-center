"use client";

import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { lastCookedLabel, recipeMeta } from "@/components/recipes/helpers";
import { StarRating } from "@/components/recipes/star-rating";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RecipeCardProps {
  recipe: Recipe;
  canManage: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onRate: (value: number | null) => void;
  className?: string;
}

export function RecipeCard({ recipe, canManage, onOpen, onToggleFavorite, onRate, className }: RecipeCardProps) {
  const meta = recipeMeta(recipe);

  return (
    <article className={cn("surface-panel group relative flex min-w-0 flex-col p-4 transition-all hover:-translate-y-0.5 hover:shadow-md", className)}>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col items-start gap-3 text-left focus-ring rounded-2xl"
        aria-label={`Open ${recipe.title}`}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-muted text-4xl transition-transform group-hover:scale-105" aria-hidden>
          {recipe.emoji || "🍲"}
        </span>
        <span className="min-w-0 w-full">
          <span className="text-wrap-safe block text-base font-semibold leading-snug">{recipe.title}</span>
          {meta ? <span className="text-wrap-safe mt-0.5 block text-sm text-muted-foreground">{meta}</span> : null}
        </span>
      </button>

      {canManage ? (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={recipe.favorite}
          aria-label={recipe.favorite ? `Remove ${recipe.title} from favorites` : `Favorite ${recipe.title}`}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-muted-foreground transition-all hover:text-primary active:scale-90 focus-ring dark:bg-white/10"
        >
          <Heart className={cn("h-5 w-5 transition-all", recipe.favorite && "fill-primary text-primary pop-in")} />
        </button>
      ) : recipe.favorite ? (
        <span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/70 dark:bg-white/10" aria-label="Favorite">
          <Heart className="h-5 w-5 fill-primary text-primary" />
        </span>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <StarRating value={recipe.rating} onChange={canManage ? onRate : undefined} label={`Rate ${recipe.title}`} />
        {recipe.kid_approved ? <Badge variant="info">Kid approved</Badge> : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{lastCookedLabel(recipe)}</p>
    </article>
  );
}
