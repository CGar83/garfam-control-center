"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StepMeta } from "@/components/planning/helpers";

interface StepCardProps {
  meta: StepMeta;
  index: number;
  done: boolean;
  onToggle: () => void;
  children: ReactNode;
  action?: ReactNode;
}

export function StepCard({ meta, index, done, onToggle, children, action }: StepCardProps) {
  return (
    <Card className={cn("fade-up transition-colors", done && "border-emerald-300/70 dark:border-emerald-800/70")} style={{ animationDelay: `${index * 60}ms` }}>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl transition-colors", done ? "bg-emerald-100 dark:bg-emerald-950/60" : "bg-muted")} aria-hidden>
            {meta.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
            <h2 className={cn("text-wrap-safe text-base font-semibold leading-tight sm:text-lg", done && "text-muted-foreground")}>{meta.title}</h2>
            <p className="text-wrap-safe mt-1 text-sm leading-6 text-muted-foreground">{meta.prompt}</p>
          </div>
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={done ? `Mark ${meta.title} as not done` : `Mark ${meta.title} as done`}
            onClick={onToggle}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-all active:scale-[0.96] focus-ring",
              done ? "border-emerald-500 bg-emerald-500 text-white shadow-sm" : "border-border bg-white/70 text-muted-foreground hover:border-emerald-400 hover:text-foreground dark:bg-white/5"
            )}
          >
            <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", done ? "border-white/70 bg-white/20" : "border-current")}>{done ? <Check className="h-3.5 w-3.5" /> : null}</span>
            <span className="hidden sm:inline">Done</span>
          </button>
        </div>
        <div className="min-w-0">{children}</div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
