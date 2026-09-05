"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileMoreItem, mobileNavItems, navigationSections } from "@/components/app/navigation";
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

function isMobileItemActive(href: string, pathname: string) {
  if (href === "/calendar") {
    return pathname === "/calendar" || pathname.startsWith("/calendar/");
  }

  if (href === "/finances") {
    return ["/finances", "/budget", "/bills", "/accounts"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const { currentMember } = useFamily();
  const MoreIcon = mobileMoreItem.icon;
  const visibleMobileItems = useMemo(() => mobileNavItems.filter((item) => memberCanAccessPath(currentMember, item.href)), [currentMember]);
  const visibleMoreSections = useMemo(
    () =>
      navigationSections
        .slice(2)
        .map((section) => {
          const visibleItems = section.items.filter((item) => memberCanAccessPath(currentMember, item.href));
          const sectionVisible = memberCanAccessPath(currentMember, section.href);
          const href = sectionVisible ? section.href : visibleItems[0]?.href;
          return href ? { ...section, href, items: visibleItems } : null;
        })
        .filter((section): section is (typeof navigationSections)[number] => Boolean(section)),
    [currentMember]
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/85 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgba(255,255,255,0.55)_inset] backdrop-blur-2xl dark:bg-card/85 lg:hidden"
      aria-label="Mobile primary"
    >
      <div className="grid min-w-0 gap-1 px-2 py-2" style={{ gridTemplateColumns: `repeat(${visibleMobileItems.length + 1}, minmax(0, 1fr))` }}>
        {visibleMobileItems.map((item) => {
          const active = isMobileItemActive(item.href, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium transition-colors focus-ring",
                active ? "bg-[#CC5500]/10 text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.title}</span>
            </Link>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium transition-colors focus-ring",
                "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <MoreIcon className="h-5 w-5" />
              <span className="max-w-full truncate">{mobileMoreItem.title}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={12} className="max-h-[70vh] w-64 overflow-y-auto">
            {visibleMoreSections.map((section, index) => {
              const SectionIcon = section.icon;
              return (
                <Fragment key={section.href}>
                  {index > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">{section.title}</DropdownMenuLabel>
                  <DropdownMenuItem asChild className={cn(pathname === section.href && "bg-primary/10 text-primary")}>
                    <Link href={section.href}>
                      <SectionIcon className="h-4 w-4" />
                      {section.mobileTitle ?? section.title}
                    </Link>
                  </DropdownMenuItem>
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
        </DropdownMenu>
      </div>
    </nav>
  );
}
