"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-20 right-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 md:bottom-4" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "rounded-lg border bg-white/90 p-4 text-card-foreground shadow-[var(--shadow-elevated)] backdrop-blur-2xl dark:bg-card/90",
            toast.variant === "destructive" && "border-red-200 bg-red-50/90 text-red-900 dark:border-red-900 dark:bg-red-950/80 dark:text-red-100",
            toast.variant === "success" &&
              "border-emerald-200 bg-emerald-50/90 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? <p className="mt-1 text-sm opacity-80">{toast.description}</p> : null}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => dismiss(toast.id)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
