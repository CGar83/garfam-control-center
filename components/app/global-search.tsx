"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/components/app/providers";
import { searchData } from "@/lib/filtering";
import { titleCase } from "@/lib/utils";

export function GlobalSearch() {
  const router = useRouter();
  const { data } = useAppData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchData(data, query).slice(0, 12), [data, query]);

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
        className="w-full min-w-0 justify-start bg-white/60 text-muted-foreground shadow-[0_1px_1px_rgba(0,0,0,0.03)_inset] lg:w-96 dark:bg-white/5"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Search everything
        <span className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium sm:inline">Cmd K</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="border-b p-4">
            <DialogTitle>Global Search</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <Input autoFocus placeholder="Search tasks, events, bills, contacts, documents, notes..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="mt-4 max-h-96 overflow-y-auto">
              {query.trim() && results.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No matching records.</p> : null}
              {results.map((result) => (
                <button
                  key={`${result.table}-${result.id}`}
                  className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left hover:bg-muted focus-ring"
                  onClick={() => {
                    router.push(result.route);
                    setOpen(false);
                    setQuery("");
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
