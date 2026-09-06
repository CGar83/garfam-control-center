"use client";

import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { layerOptions, type LayerState } from "./helpers";

interface LayerTogglesProps {
  layers: LayerState;
  onChange: (next: LayerState) => void;
  /** When false the bills & appointments pill is hidden, since those items never appear. */
  includeSensitive?: boolean;
}

const pillBase = "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-all focus-ring";
const pillOn = "border-transparent bg-foreground text-background shadow-sm";
const pillOff = "border-border bg-white/70 text-muted-foreground hover:border-foreground/20 hover:text-foreground dark:bg-white/5";

/** Small pills that show or hide whole kinds of things on the calendar. Events are always on. */
export function LayerToggles({ layers, onChange, includeSensitive = true }: LayerTogglesProps) {
  const visibleOptions = includeSensitive ? layerOptions : layerOptions.filter((option) => option.key !== "money");
  return (
    <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5" role="group" aria-label="Show on calendar">
      <span className={cn(pillBase, pillOn, "cursor-default opacity-90")} aria-disabled title="Events are always shown">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
        Events
      </span>
      {visibleOptions.map((option) => {
        const Icon = option.icon;
        const active = layers[option.key];
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange({ ...layers, [option.key]: !active })}
            className={cn(pillBase, active ? pillOn : pillOff, "active:scale-[0.97]")}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
