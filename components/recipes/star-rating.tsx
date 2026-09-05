"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  size?: "sm" | "md";
  label?: string;
}

export function StarRating({ value, onChange, size = "sm", label = "Rating" }: StarRatingProps) {
  const current = value ?? 0;
  const interactive = Boolean(onChange);
  const starClass = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className="inline-flex items-center" role={interactive ? "radiogroup" : "img"} aria-label={interactive ? label : `${label}: ${current ? `${current} of 5` : "not rated"}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= current;
        if (!interactive) {
          return <Star key={star} className={cn(starClass, filled ? "fill-amber-400 text-amber-400" : "text-border")} aria-hidden />;
        }
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === current}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={(event) => {
              event.stopPropagation();
              onChange?.(star === current ? null : star);
            }}
            className={cn(
              "flex items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95 focus-ring",
              size === "sm" ? "h-7 w-7" : "h-10 w-10"
            )}
          >
            <Star className={cn(starClass, filled ? "fill-amber-400 text-amber-400" : "text-border hover:text-amber-300")} />
          </button>
        );
      })}
    </div>
  );
}
