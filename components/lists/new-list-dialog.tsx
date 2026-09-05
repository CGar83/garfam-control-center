"use client";

import { useState } from "react";
import { FilePlus2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppData } from "@/components/app/providers";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { kindLabels, listTemplates, parseItemInput, type ListTemplate } from "@/components/lists/helpers";
import { useToast } from "@/hooks/use-toast";
import { moduleConfigs } from "@/lib/modules";
import { cn } from "@/lib/utils";

interface NewListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (listId: string) => void;
}

export function NewListDialog({ open, onOpenChange, onCreated }: NewListDialogProps) {
  const { createRecord, currentMemberId } = useAppData();
  const { toast } = useToast();
  const [blankOpen, setBlankOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function createFromTemplate(template: ListTemplate) {
    if (busyId) return;
    setBusyId(template.id);
    try {
      const list = await createRecord("shared_lists", {
        name: template.name,
        kind: template.kind,
        emoji: template.emoji,
        description: template.description,
        archived: false,
        created_by: currentMemberId
      });
      await Promise.all(
        template.items.map((raw, index) => {
          const parsed = parseItemInput(raw);
          return createRecord("list_items", {
            list_id: list.id,
            name: parsed.name,
            checked: false,
            quantity: parsed.quantity,
            note: null,
            assigned_to: null,
            sort_order: index,
            added_by: currentMemberId
          });
        })
      );
      toast({ title: `${template.emoji} ${template.name} is ready`, description: `${template.items.length} items added. Tweak anything you like.`, variant: "success" });
      onOpenChange(false);
      onCreated(list.id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New list</DialogTitle>
            <DialogDescription>Start from scratch or grab a ready-made list and tweak it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                setBlankOpen(true);
              }}
              className="record-tile flex min-h-24 items-center gap-3 border-dashed p-4 text-left transition-all hover:border-primary/50 hover:bg-white active:scale-[0.98] focus-ring dark:hover:bg-white/10"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FilePlus2 className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">Blank list</span>
                <span className="block text-xs text-muted-foreground">Name it, pick a type, add items yourself.</span>
              </span>
            </button>
            {listTemplates.map((template) => {
              const busy = busyId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => void createFromTemplate(template)}
                  className={cn(
                    "record-tile flex min-h-24 items-center gap-3 p-4 text-left transition-all hover:border-primary/50 hover:bg-white active:scale-[0.98] focus-ring disabled:opacity-60 dark:hover:bg-white/10",
                    busy && "border-primary/50"
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl" aria-hidden>
                    {busy ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : template.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate font-semibold">{template.name}</span>
                      <Badge variant="outline" className="shrink-0">
                        {kindLabels[template.kind]}
                      </Badge>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{template.blurb}</span>
                    <span className="mt-1 block text-[11px] font-medium text-muted-foreground">{template.items.length} items</span>
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <RecordFormDialog config={moduleConfigs.lists} open={blankOpen} onOpenChange={setBlankOpen} />
    </>
  );
}
