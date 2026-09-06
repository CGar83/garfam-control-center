"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArchiveRestore, ChevronDown, ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { useAppData } from "@/components/app/providers";
import { itemsForList } from "@/components/lists/helpers";
import { ListCard } from "@/components/lists/list-card";
import { ListDetail } from "@/components/lists/list-detail";
import { NewListDialog } from "@/components/lists/new-list-dialog";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function ListsHub() {
  const { data, updateRecord, currentMember } = useAppData();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lists = useRealtimeTable("shared_lists");
  useRealtimeTable("list_items");

  const isParent = !currentMember || currentMember.role !== "viewer";
  const selectedId = searchParams.get("list");
  const [creating, setCreating] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const active = useMemo(
    () => lists.filter((list) => !list.archived).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [lists]
  );
  const archived = useMemo(() => lists.filter((list) => list.archived).sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [lists]);
  const selected = lists.find((list) => list.id === selectedId) ?? null;

  const select = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("list", id);
      else params.delete("list");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (selectedId && !selected) select(null);
  }, [select, selected, selectedId]);

  const knownIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!knownIds.current) {
      knownIds.current = new Set(lists.map((list) => list.id));
      return;
    }
    const fresh = lists.filter((list) => !knownIds.current?.has(list.id));
    knownIds.current = new Set(lists.map((list) => list.id));
    const newest = fresh.filter((list) => Date.now() - new Date(list.created_at).getTime() < 15000).pop();
    if (newest) select(newest.id);
  }, [lists, select]);

  const showDetail = Boolean(selected);

  return (
    <div className="app-page">
      <PageHeader
        title="Shared Lists"
        description="Packing lists, weekend to-dos, wishlists, and projects the whole family can check off together."
        action={
          isParent ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New list
            </Button>
          ) : undefined
        }
      />

      {active.length === 0 && !showDetail ? (
        <div className="fade-up">
          <EmptyState
            title="No lists yet"
            description={isParent ? "Start a packing list, a weekend to-do list, or a party plan. Templates get you going in one tap." : "Ask a parent to start the first list and you can help check things off."}
            action={
              isParent ? (
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" />
                  New list
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className={cn("grid min-w-0 gap-4", showDetail && "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start")}>
          <div className={cn("min-w-0", showDetail && "hidden lg:block")}>
            <div className={cn("fade-up", showDetail ? "flex flex-col gap-3" : "grid-auto-fit")}>
              {active.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  items={itemsForList(data.list_items, list.id)}
                  active={list.id === selectedId}
                  compact={showDetail}
                  onSelect={() => select(list.id)}
                />
              ))}
              {active.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border/80 p-4 text-center text-sm text-muted-foreground">No active lists.</p>
              ) : null}
            </div>
          </div>

          {selected ? (
            <div className="min-w-0">
              <ListDetail key={selected.id} list={selected} isParent={isParent} onBack={() => select(null)} onDeleted={() => select(null)} />
            </div>
          ) : null}
        </div>
      )}

      {archived.length && !showDetail ? (
        <section className="fade-up fade-up-delay-2 min-w-0">
          <button
            type="button"
            onClick={() => setArchivedOpen((value) => !value)}
            aria-expanded={archivedOpen}
            className="flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-ring"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", archivedOpen ? "rotate-0" : "-rotate-90")} />
            Archived lists ({archived.length})
          </button>
          {archivedOpen ? (
            <div className="mt-3 grid-auto-fit-sm">
              {archived.map((list) => {
                const items = itemsForList(data.list_items, list.id);
                const done = items.filter((item) => item.checked).length;
                return (
                  <div key={list.id} className="record-tile flex items-center gap-3 p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl" aria-hidden>
                      {list.emoji || "📝"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{list.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {items.length === 0 ? "No items" : `${done} of ${items.length} done`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => select(list.id)} aria-label={`Open ${list.name}`}>
                      <ListChecks className="h-4 w-4" />
                    </Button>
                    {isParent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await updateRecord("shared_lists", list.id, { archived: false });
                          toast({ title: "List restored", description: `${list.name} is back on the board.`, variant: "success" });
                        }}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        Unarchive
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      <NewListDialog open={creating} onOpenChange={setCreating} onCreated={(id) => select(id)} />
    </div>
  );
}
