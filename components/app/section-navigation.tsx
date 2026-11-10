"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { navigationSections } from "./navigation";
import { useFamily } from "@/hooks/use-family";
import { memberCanAccessPath } from "@/lib/access-control";

export function SectionNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentMember } = useFamily();
  const section = navigationSections.find(group => group.items.some(item => item.href === pathname));
  const items = section?.items.filter(item => memberCanAccessPath(currentMember, item.href)) ?? [];
  if (!section || items.length < 2) return null;
  return <nav aria-label={`${section.title} pages`} className="mb-5 lg:hidden">
    <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="section-page">{section.title}</label>
    <select id="section-page" aria-label={`${section.title} page`} value={pathname} onChange={event => router.push(event.target.value)} className="h-11 w-full rounded-lg border bg-card px-3 text-sm focus-ring">
      {items.map(item => <option key={item.href} value={item.href}>{item.title}</option>)}
    </select>
    <noscript>{items.map(item => <Link key={item.href} href={item.href}>{item.title} </Link>)}</noscript>
  </nav>;
}
