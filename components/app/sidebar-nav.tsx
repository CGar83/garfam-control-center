"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { navItems } from "@/components/app/navigation";
import { useFamily } from "@/hooks/use-family";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();
  const { family, supabaseConfigured, usingLocalData } = useFamily();
  const workspaceLabel = supabaseConfigured && usingLocalData ? "Private workspace" : family?.name ?? "Family workspace";

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r bg-white/70 shadow-[1px_0_0_rgba(255,255,255,0.55)_inset] backdrop-blur-2xl dark:bg-card/70 md:block">
      <div className="flex h-full flex-col">
        <div className="border-b p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_8px_24px_-14px_rgba(204,85,0,0.8)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Family Control Center</p>
              <p className="truncate text-xs text-muted-foreground">{workspaceLabel}</p>
            </div>
          </div>
        </div>
        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all focus-ring",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_8px_22px_-16px_rgba(204,85,0,0.85)]"
                    : "text-muted-foreground hover:bg-white/70 hover:text-foreground dark:hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
