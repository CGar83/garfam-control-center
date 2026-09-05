"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { navigationSections, type NavSection } from "@/components/app/navigation";
import { useFamily } from "@/hooks/use-family";
import { cn } from "@/lib/utils";

function isSectionActive(section: NavSection, pathname: string) {
  return pathname === section.href || section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function SidebarNav() {
  const pathname = usePathname();
  const { family, supabaseConfigured, usingLocalData } = useFamily();
  const workspaceLabel = supabaseConfigured && usingLocalData ? "Private workspace" : family?.name ?? "Family workspace";
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenSections((current) => {
      let changed = false;
      const next = { ...current };

      navigationSections.forEach((section) => {
        if (isSectionActive(section, pathname) && section.items.length > 0 && !next[section.title]) {
          next[section.title] = true;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [pathname]);

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r bg-white/70 shadow-[1px_0_0_rgba(255,255,255,0.55)_inset] backdrop-blur-2xl dark:bg-card/70 lg:block">
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
          {navigationSections.map((section) => {
            const active = isSectionActive(section, pathname);
            const exactActive = pathname === section.href;
            const open = section.items.length > 0 && (openSections[section.title] ?? active);
            const Icon = section.icon;
            return (
              <div key={section.href} className="space-y-1">
                <div
                  className={cn(
                    "flex items-center rounded-md transition-all",
                    exactActive
                      ? "bg-primary text-primary-foreground shadow-[0_8px_22px_-16px_rgba(204,85,0,0.85)]"
                      : active
                        ? "bg-[#ACE1AF]/35 text-foreground dark:bg-[#ACE1AF]/15"
                        : "text-muted-foreground hover:bg-white/70 hover:text-foreground dark:hover:bg-white/10"
                  )}
                >
                  <Link href={section.href} className="flex min-w-0 flex-1 items-center gap-3 rounded-l-md px-3 py-2 text-sm font-medium focus-ring">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{section.title}</span>
                  </Link>
                  {section.items.length > 0 ? (
                    <button
                      type="button"
                      aria-label={`${open ? "Collapse" : "Expand"} ${section.title}`}
                      aria-expanded={open}
                      onClick={() => setOpenSections((current) => ({ ...current, [section.title]: !open }))}
                      className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-current/75 transition hover:bg-black/5 hover:text-current focus-ring dark:hover:bg-white/10"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                    </button>
                  ) : null}
                </div>
                {open ? (
                  <div className="ml-5 space-y-1 border-l border-border/80 pl-2">
                    {section.items.map((item) => {
                      const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      const ItemIcon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex min-w-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all focus-ring",
                            itemActive
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-white/70 hover:text-foreground dark:hover:bg-white/10"
                          )}
                        >
                          <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
