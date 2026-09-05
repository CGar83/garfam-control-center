"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileNavItems } from "@/components/app/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/85 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgba(255,255,255,0.55)_inset] backdrop-blur-2xl dark:bg-card/85 lg:hidden"
      aria-label="Mobile primary"
    >
      <div className="scrollbar-thin flex min-w-0 gap-1 overflow-x-auto px-2 py-2">
        {mobileNavItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors focus-ring",
                active ? "bg-[#CC5500]/10 text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
