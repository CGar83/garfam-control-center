"use client";

import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { calendarViews, type CalendarView } from "./helpers";

interface CalendarHeaderProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  label: string;
  showingToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAdd?: () => void;
}

export function CalendarHeader({ view, onViewChange, label, showingToday, onPrev, onNext, onToday, onAdd }: CalendarHeaderProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 items-center rounded-xl border border-border/80 bg-white/70 p-0.5 shadow-[0_1px_1px_rgba(0,0,0,0.03)] dark:bg-white/5">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={onPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-9 rounded-lg px-3 text-sm", showingToday ? "text-primary" : "text-foreground")}
            onClick={onToday}
            aria-pressed={showingToday}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={onNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="min-w-0 truncate text-lg font-semibold leading-tight sm:text-xl" aria-live="polite">
          {label}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <Tabs value={view} onValueChange={(value) => onViewChange(value as CalendarView)} className="min-w-0 flex-1 lg:flex-none">
          <TabsList className="w-full flex-nowrap lg:w-auto" aria-label="Calendar view">
            {calendarViews.map((option) => (
              <TabsTrigger key={option.key} value={option.key} className="min-h-9 flex-1 px-2 sm:px-3 lg:flex-none">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {onAdd ? (
          <Button onClick={onAdd} className="h-10 shrink-0 px-3 sm:px-4" aria-label="Add event">
            <CalendarPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add event</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
