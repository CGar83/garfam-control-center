"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { mobileMoreItem, mobileNavItems, navigationSections } from "@/components/app/navigation";
import { QuickAddSheet } from "@/components/app/quick-add-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useFamily } from "@/hooks/use-family";
import { memberCanAccessPath } from "@/lib/access-control";
import { cn } from "@/lib/utils";

const sectionForTab: Record<string, string[]> = {
  "/today": ["/today"],
  "/calendar": ["/calendar"],
  "/chores": ["/chores", "/routines", "/tasks", "/memories", "/activities", "/goals"],
  "/grocery": ["/grocery", "/lists", "/meals", "/recipes"]
};

function isMobileItemActive(href: string, pathname: string) {
  const paths = sectionForTab[href] ?? [href];
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function MobileNav() {
  const pathname = usePathname();
  const { currentMember } = useFamily();
  const [quickOpen, setQuickOpen] = useState(false);
  const MoreIcon = mobileMoreItem.icon;
  const visibleMobileItems = useMemo(() => mobileNavItems.filter((item) => memberCanAccessPath(currentMember, item.href)), [currentMember]);
  const visibleMoreSections = useMemo(
    () =>
      navigationSections
        .map((section) => {
          const visibleItems = section.items.filter((item) => memberCanAccessPath(currentMember, item.href));
          const sectionVisible = memberCanAccessPath(currentMember, section.href);
          const href = sectionVisible ? section.href : visibleItems[0]?.href;
          return href ? { ...section, href, items: visibleItems } : null;
        })
        .filter((section): section is (typeof navigationSections)[number] => Boolean(section)),
    [currentMember]
  );

  const left = visibleMobileItems.slice(0, 2);
  const right = visibleMobileItems.slice(2, 4);

  function renderTab(item: (typeof mobileNavItems)[number]) {
    const active = isMobileItemActive(item.href, pathname);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold transition-all focus-ring",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className={cn("flex h-8 w-12 items-center justify-center rounded-full transition-all", active && "bg-primary/12")}>
          <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className="max-w-full truncate">{item.title}</span>
      </Link>
    );
  }

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-white/88 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-24px_rgba(0,0,0,0.35)] backdrop-blur-2xl dark:bg-card/88 lg:hidden"
        aria-label="Mobile primary"
      >
        <div className="grid grid-cols-5 items-end gap-1 px-2 pt-1.5 pb-1.5">
          {left.map(renderTab)}
          <div className="relative flex items-end justify-center">
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              aria-label="Quick add"
              className="absolute -top-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--brand-glow)] ring-4 ring-background transition-transform active:scale-95 focus-ring"
            >
              <Plus className="h-7 w-7" strokeWidth={2.6} />
            </button>
            <span className="pb-1 text-[11px] font-semibold text-muted-foreground">Add</span>
          </div>
          {right.map(renderTab)}
          {right.length < 2 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground focus-ring">
                  <span className="flex h-8 w-12 items-center justify-center rounded-full">
                    <MoreIcon className="h-5 w-5" />
                  </span>
                  <span>{mobileMoreItem.title}</span>
                </button>
              </DropdownMenuTrigger>
              <MoreMenu sections={visibleMoreSections} pathname={pathname} />
            </DropdownMenu>
          ) : null}
        </div>
        {right.length === 2 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More sections"
                className="absolute right-2 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-ring"
              >
                <MoreIcon className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <MoreMenu sections={visibleMoreSections} pathname={pathname} />
          </DropdownMenu>
        ) : null}
      </nav>
      <QuickAddSheet open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}

function MoreMenu({ sections, pathname }: { sections: typeof navigationSections; pathname: string }) {
  return (
    <DropdownMenuContent align="end" side="top" sideOffset={12} className="max-h-[70vh] w-64 overflow-y-auto rounded-2xl">
      {sections.map((section, index) => {
        const SectionIcon = section.icon;
        return (
          <Fragment key={section.href}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            {section.items.length > 0 ? (
              <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">{section.title}</DropdownMenuLabel>
            ) : (
              <DropdownMenuItem asChild className={cn(pathname === section.href && "bg-primary/10 text-primary")}>
                <Link href={section.href}>
                  <SectionIcon className="h-4 w-4" />
                  {section.title}
                </Link>
              </DropdownMenuItem>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <DropdownMenuItem key={item.href} asChild className={cn(active && "bg-primary/10 text-primary")}>
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </Fragment>
        );
      })}
    </DropdownMenuContent>
  );
}
