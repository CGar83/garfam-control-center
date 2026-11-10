"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/components/app/providers";
import { searchData } from "@/lib/filtering";
import { memberCanAccessPath } from "@/lib/access-control";
import { titleCase } from "@/lib/utils";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { navigationSections } from "@/components/app/navigation";

export function GlobalSearch() {
  const router = useRouter();
  const { data, currentMember } = useAppData();
  const { privacyMode } = usePrivacyMode();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchData(data, query).filter((result) => memberCanAccessPath(currentMember, result.route) && (!privacyMode || !/^\/(finances|budget|bills|accounts|health|emergency|relationship|checkin)(\?|\/|$)/.test(result.route))).slice(0, 12), [currentMember, data, privacyMode, query]);
  const pages = useMemo(() => {
    const unique = new Map(navigationSections.flatMap(section => [section, ...section.items]).map(item => [item.href, item]));
    const term = query.trim().toLowerCase();
    return [...unique.values()].filter(item => memberCanAccessPath(currentMember, item.href) && (!term || item.title.toLowerCase().includes(term))).slice(0, term ? 6 : 8);
  }, [currentMember, query]);
  function navigate(route: string) {
    router.push(route);
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        aria-label="Search pages and records"
        className="h-10 w-10 shrink-0 justify-center bg-white/60 px-0 text-muted-foreground sm:w-full sm:min-w-0 sm:shrink sm:justify-start sm:px-4 lg:w-96 dark:bg-white/5"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search everything</span>
        <span className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium sm:inline">Cmd K</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="border-b p-4">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <Input aria-label="Search pages and records" autoFocus placeholder="Search pages, tasks, events, and records" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="mt-4 max-h-96 overflow-y-auto">
              {pages.length > 0 && <><p className="px-3 py-2 text-xs font-semibold text-muted-foreground">Pages</p>{pages.map(page => { const Icon = page.icon; return <button key={page.href} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm hover:bg-muted focus-ring" onClick={() => navigate(page.href)}><Icon className="h-4 w-4 shrink-0" />{page.title}</button>; })}</>}
              {results.length > 0 && <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">Records</p>}
              {query.trim() && results.length === 0 && pages.length === 0 ? <p role="status" className="p-4 text-sm text-muted-foreground">No matching pages or records. Try a shorter search.</p> : null}
              {results.map((result) => (
                <button
                  key={`${result.table}-${result.id}`}
                  className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left hover:bg-muted focus-ring"
                  onClick={() => {
                    navigate(result.route);
                  }}
                >
                  <span>
                    <span className="block text-sm font-medium">{result.title}</span>
                    <span className="block text-xs text-muted-foreground">{titleCase(result.subtitle)}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">Open</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
