"use client";

import { cn } from "@/lib/utils";

export const moodFaces = ["😞", "😕", "😐", "🙂", "😄"] as const;
export const moodLabels = ["Rough", "Meh", "Okay", "Good", "Great"] as const;

interface MoodPickerProps {
  value: number | null;
  onChange: (value: number) => void;
  size?: "sm" | "lg";
  disabled?: boolean;
}

export function MoodPicker({ value, onChange, size = "lg", disabled }: MoodPickerProps) {
  return (
    <div className="flex items-center justify-between gap-1" role="radiogroup" aria-label="Mood">
      {moodFaces.map((face, index) => {
        const mood = index + 1;
        const active = value === mood;
        return (
          <button
            key={face}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={moodLabels[index]}
            disabled={disabled}
            onClick={() => onChange(mood)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border transition-all active:scale-95 focus-ring disabled:opacity-60",
              size === "lg" ? "min-h-16 text-3xl" : "min-h-12 text-2xl",
              active ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30" : "border-border/70 bg-white/70 hover:border-primary/40 dark:bg-white/5"
            )}
          >
            <span className={cn("transition-transform", active && "scale-110")}>{face}</span>
            {size === "lg" ? <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{moodLabels[index]}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
