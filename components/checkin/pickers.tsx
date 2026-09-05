"use client";

import { cn } from "@/lib/utils";
import { energyLabels, moodFaces, moodLabels } from "@/components/checkin/helpers";

interface PickerProps {
  value: number | null;
  onChange: (value: number) => void;
  /** Render on the coral hero (light text) or on a card. */
  onHero?: boolean;
}

export function MoodPicker({ value, onChange, onHero }: PickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Mood">
      {moodFaces.map((face, index) => {
        const level = index + 1;
        const active = value === level;
        return (
          <button
            key={face}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${moodLabels[index]} (${level} of 5)`}
            onClick={() => onChange(level)}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-3xl transition-all active:scale-[0.94] focus-ring sm:min-h-20 sm:text-4xl",
              onHero
                ? active
                  ? "border-white bg-white text-neutral-900 shadow-lg scale-105"
                  : "border-white/30 bg-white/10 hover:bg-white/20"
                : active
                  ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30 scale-105"
                  : "border-border bg-white/70 hover:border-primary/40 dark:bg-white/5"
            )}
          >
            <span aria-hidden className={cn("transition-transform", active ? "" : "grayscale-[35%] opacity-90")}>
              {face}
            </span>
            <span className={cn("text-[10px] font-semibold sm:text-xs", onHero ? (active ? "text-neutral-900" : "text-white/85") : active ? "text-primary" : "text-muted-foreground")}>{moodLabels[index]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function EnergyPicker({ value, onChange, onHero }: PickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Energy">
      {energyLabels.map((label, index) => {
        const level = index + 1;
        const active = value === level;
        const filled = value !== null && level <= value;
        return (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} energy (${level} of 5)`}
            onClick={() => onChange(level)}
            className={cn(
              "flex min-h-16 flex-col items-center justify-end gap-1.5 rounded-2xl border px-2 pb-2 pt-3 transition-all active:scale-[0.94] focus-ring sm:min-h-20",
              onHero
                ? active
                  ? "border-white bg-white/95 shadow-lg"
                  : "border-white/30 bg-white/10 hover:bg-white/20"
                : active
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                  : "border-border bg-white/70 hover:border-primary/40 dark:bg-white/5"
            )}
          >
            <span className="flex h-7 items-end gap-0.5 sm:h-9" aria-hidden>
              {Array.from({ length: level }, (_, bar) => (
                <span
                  key={bar}
                  className={cn("w-1.5 rounded-sm transition-colors sm:w-2", filled ? (onHero && !active ? "bg-white" : "bg-emerald-500") : onHero ? "bg-white/40" : "bg-muted-foreground/25")}
                  style={{ height: `${40 + bar * 15}%` }}
                />
              ))}
            </span>
            <span className={cn("text-[10px] font-semibold sm:text-xs", onHero ? (active ? "text-neutral-900" : "text-white/85") : active ? "text-primary" : "text-muted-foreground")}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact energy bars for read-only display. */
export function EnergyBars({ value, className, onHero }: { value: number; className?: string; onHero?: boolean }) {
  return (
    <span className={cn("inline-flex h-4 items-end gap-0.5", className)} role="img" aria-label={`Energy ${value} of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={cn("w-1.5 rounded-sm", index < value ? (onHero ? "bg-white" : "bg-emerald-500") : onHero ? "bg-white/35" : "bg-muted-foreground/25")}
          style={{ height: `${40 + index * 15}%` }}
        />
      ))}
    </span>
  );
}
