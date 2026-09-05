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
          className: "border-[#ACE1AF] bg-[#ACE1AF]/35 text-[#22552d]"
        }
      : {
          label: "Sign in required",
          detail: "Secure cloud ready",
          icon: Database,
          className: "border-[#CC5500]/30 bg-[#CC5500]/10 text-[#8a3900]"
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
