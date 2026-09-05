"use client";

import { CheckCircle2, CircleDashed, Database } from "lucide-react";
import { useFamily } from "@/hooks/use-family";
import { cn } from "@/lib/utils";

export function AuthStatusBadge({ className }: { className?: string }) {
  const { currentUser, supabaseConfigured, usingLocalData } = useFamily();
  const isSignedIn = supabaseConfigured && !usingLocalData;

  const state = !supabaseConfigured
    ? {
        label: "Local workspace",
        detail: "Browser-only",
        icon: CircleDashed,
        className: "border-muted-foreground/20 bg-muted/60 text-muted-foreground"
      }
    : isSignedIn
      ? {
        label: "Logged in",
        detail: currentUser.email,
        icon: CheckCircle2,
        className: "border-[#ACE1AF] bg-[#ACE1AF]/35 text-[#22552d] dark:border-[#ACE1AF]/45 dark:bg-[#ACE1AF]/15 dark:text-[#D7F2D9]"
      }
    : {
        label: "Sign in required",
        detail: "Secure cloud ready",
        icon: Database,
        className: "border-[#F0705A]/35 bg-[#F0705A]/10 text-[#8E3A2B] dark:border-[#F0705A]/50 dark:text-[#F5A797]"
      };

  const Icon = state.icon;

  return (
    <div className={cn("inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold", state.className, className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-nowrap">{state.label}</span>
      <span className="hidden max-w-48 truncate font-normal opacity-80 xl:inline">{state.detail}</span>
    </div>
  );
}
