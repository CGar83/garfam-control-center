"use client";

import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, ArrowLeft, ChevronDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useAppData } from "@/components/app/providers";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { itemsForList, kindLabels, listProgress, nextSortOrder, parseItemInput } from "@/components/lists/helpers";
import { ListItemRow } from "@/components/lists/list-item-row";
import { useToast } from "@/hooks/use-toast";
import { moduleConfigs } from "@/lib/modules";
import type { SharedList } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ListDetailProps {
  list: SharedList;
  isParent: boolean;
  onBack: () => void;
  onDeleted: () => void;
}

export function ListDetail({ list, isParent, onBack, onDeleted }: ListDetailProps) {
  const { data, createRecord, updateRecord, deleteRecord, currentMemberId } = useAppData();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

  const items = useMemo(() => itemsForList(data.list_items, list.id), [data.list_items, list.id]);
  const open = items.filter((item) => !item.checked);
  const done = items.filter((item) => item.checked);
  const progress = listProgress(items);

  async function addItem() {
    const parsed = parseItemInput(draft);
    if (!parsed.name) return;
    setDraft("");
    await createRecord("list_items", {
      list_id: list.id,
      name: parsed.name,
      checked: false,
      quantity: parsed.quantity,
      note: null,
      assigned_to: null,
      sort_order: nextSortOrder(items),
      added_by: currentMemberId
    });
  }

  async function clearDone() {
    await Promise.all(done.map((item) => deleteRecord("list_items", item.id)));
    toast({ title: "Cleared", description: `${done.length} finished ${done.length === 1 ? "item" : "items"} removed.`, variant: "success" });
  }

  async function toggleArchive() {
    await updateRecord("shared_lists", list.id, { archived: !list.archived });
    toast({ title: list.archived ? "List restored" : "List archived", description: list.archived ? `${list.name} is back on the board.` : `${list.name} moved to archived lists.` });
    if (!list.archived) onBack();
  }

  async function deleteList() {
    await Promise.all(items.map((item) => deleteRecord("list_items", item.id)));
    await deleteRecord("shared_lists", list.id);
    toast({ title: "List deleted", description: `${list.name} and its items are gone.` });
    onDeleted();
  }

  return (
    <section className="surface-panel fade-up flex min-w-0 flex-col p-4 sm:p-5" aria-label={list.name}>
      <div className="flex min-w-0 items-start gap-3">
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0 rounded-full lg:hidden" onClick={onBack} aria-label="Back to all lists">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl" aria-hidden>
          {list.emoji || "📝"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-wrap-safe text-xl font-semibold leading-tight">{list.name}</h2>
            <Badge variant="outline">{kindLabels[list.kind] ?? list.kind}</Badge>
            {list.archived ? <Badge variant="secondary">Archived</Badge> : null}
          </div>
          {list.description ? <p className="text-wrap-safe mt-1 text-sm text-muted-foreground">{list.description}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {progress.total === 0 ? "Add the first item below." : progress.done === progress.total ? "Everything is checked off. Nice." : `${progress.done} of ${progress.total} done`}
          </p>
        </div>
        {isParent ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 rounded-full" aria-label="List options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit list
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void toggleArchive()}>
                {list.archived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                {list.archived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full transition-all duration-500", progress.percent === 100 ? "bg-[#ACE1AF]" : "bg-primary")} style={{ width: `${progress.percent}%` }} />
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void addItem();
        }}
      >
        <Input
          aria-label="Add an item"
          placeholder={list.kind === "packing" ? "Add an item, like 2x Sunscreen" : "Add an item…"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="h-11 flex-1 text-base"
          autoComplete="off"
        />
        <Button type="submit" className="h-11 shrink-0" disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>

      <div className="mt-4 space-y-2">
        {open.length ? (
          open.map((item) => <ListItemRow key={item.id} item={item} canManage={isParent} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center">
            <p className="text-sm font-medium">{items.length ? "All checked off." : "Nothing here yet."}</p>
            <p className="mt-1 text-xs text-muted-foreground">{items.length ? "Clear the done pile or add what's next." : "Type above and press Enter to add the first item."}</p>
          </div>
        )}
      </div>

      {done.length ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDoneOpen((value) => !value)}
              aria-expanded={doneOpen}
              className="flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-ring"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", doneOpen ? "rotate-0" : "-rotate-90")} />
              Done ({done.length})
            </button>
            {isParent ? (
              <Button variant="ghost" size="sm" onClick={() => void clearDone()}>
                Clear done
              </Button>
            ) : null}
          </div>
          {doneOpen ? (
            <div className="mt-2 space-y-2">
              {done.map((item) => (
                <ListItemRow key={item.id} item={item} canManage={isParent} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <RecordFormDialog config={moduleConfigs.lists} record={list} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete "${list.name}"?`}
        description={`This removes the list and its ${items.length} ${items.length === 1 ? "item" : "items"}. Archiving keeps it around instead.`}
        confirmLabel="Delete list"
        onConfirm={deleteList}
      />
    </section>
  );
}
