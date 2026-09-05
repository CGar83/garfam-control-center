"use client";

import { useState } from "react";
import { Check, MoreHorizontal, Pencil, Trash2, UserRound, UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/app/member-avatar";
import { useAppData } from "@/components/app/providers";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { paletteForMember } from "@/lib/member-colors";
import type { ListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ListItemRowProps {
  item: ListItem;
  canManage: boolean;
}

export function ListItemRow({ item, canManage }: ListItemRowProps) {
  const { updateRecord, deleteRecord } = useAppData();
  const { members, findMember } = useFamilyMembers();
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [note, setNote] = useState(item.note ?? "");

  const assignee = findMember(item.assigned_to);
  const palette = assignee ? paletteForMember(assignee, members) : null;

  function openEdit() {
    setQuantity(item.quantity ?? "");
    setNote(item.note ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    await updateRecord("list_items", item.id, {
      quantity: quantity.trim() || null,
      note: note.trim() || null
    });
    setEditing(false);
  }

  return (
    <>
      <div
        className={cn(
          "record-tile flex min-h-14 items-center gap-3 border-l-4 py-2 pl-3 pr-2 transition-all",
          item.checked && "bg-muted/40 dark:bg-white/[0.03]"
        )}
        style={{ borderLeftColor: palette?.solid ?? "transparent" }}
      >
        <button
          type="button"
          aria-pressed={item.checked}
          aria-label={item.checked ? `Uncheck ${item.name}` : `Check off ${item.name}`}
          onClick={() => updateRecord("list_items", item.id, { checked: !item.checked })}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90 focus-ring",
            item.checked ? "border-[#ACE1AF] bg-[#ACE1AF] text-[#235226]" : "border-border bg-white/80 text-transparent hover:border-primary/60 dark:bg-white/5"
          )}
        >
          <Check className={cn("h-5 w-5 transition-transform", item.checked ? "scale-100 pop-in" : "scale-50")} strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <p className={cn("text-wrap-safe text-base font-medium leading-snug", item.checked && "text-muted-foreground line-through")}>
            {item.name}
            {item.quantity ? <span className="ml-2 text-sm font-normal text-muted-foreground">x{item.quantity}</span> : null}
          </p>
          {item.note ? <p className="text-wrap-safe mt-0.5 text-xs text-muted-foreground">{item.note}</p> : null}
        </div>

        {assignee ? <MemberAvatar member={assignee} size="sm" /> : null}

        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full" aria-label={`Options for ${item.name}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserRound className="mr-2 h-4 w-4" />
                  Assign to…
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  <DropdownMenuLabel>Family</DropdownMenuLabel>
                  {members.map((member) => (
                    <DropdownMenuItem key={member.id} onSelect={() => updateRecord("list_items", item.id, { assigned_to: member.id })}>
                      <MemberAvatar member={member} size="xs" className="mr-2" />
                      {member.display_name}
                      {item.assigned_to === member.id ? <Check className="ml-auto h-4 w-4" /> : null}
                    </DropdownMenuItem>
                  ))}
                  {item.assigned_to ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => updateRecord("list_items", item.id, { assigned_to: null })}>
                        <UserRoundX className="mr-2 h-4 w-4" />
                        Unassign
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onSelect={openEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit note / quantity
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => deleteRecord("list_items", item.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{item.name}</DialogTitle>
            <DialogDescription>Add a quantity or a quick note for whoever picks this up.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void saveEdit();
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor={`qty-${item.id}`} className="text-sm font-medium">
                Quantity
              </label>
              <Input id={`qty-${item.id}`} value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="2, 1 pack, a handful…" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`note-${item.id}`} className="text-sm font-medium">
                Note
              </label>
              <Input id={`note-${item.id}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reef safe, purple if possible…" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
