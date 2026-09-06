"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarPlus,
  ClipboardPlus,
  HeartHandshake,
  MessageSquarePlus,
  PartyPopper,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  Trophy,
  WalletCards,
  Wand2
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/app/member-avatar";
import { useAppData } from "@/components/app/providers";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useToast } from "@/hooks/use-toast";
import { memberCanAccessPath } from "@/lib/access-control";
import { moduleConfigs, type ModuleKey } from "@/lib/modules";
import { quickExamples, quickParse, type QuickParseResult } from "@/lib/quick-parse";
import { cn } from "@/lib/utils";

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const structuredItems: Array<{ label: string; module: ModuleKey; icon: typeof CalendarPlus; defaults?: Record<string, unknown> }> = [
  { label: "Event", module: "calendar", icon: CalendarPlus },
  { label: "Task", module: "tasks", icon: ClipboardPlus },
  { label: "Grocery", module: "grocery", icon: ShoppingCart },
  { label: "Chore", module: "chores", icon: Trophy },
  { label: "Memory", module: "journal", icon: Sparkles },
  { label: "Activity idea", module: "activities", icon: PartyPopper },
  { label: "Bill", module: "bills", icon: ReceiptText },
  { label: "Expense", module: "transactions", icon: WalletCards, defaults: { transaction_type: "expense" } },
  { label: "Family note", module: "communication", icon: MessageSquarePlus },
  { label: "Check-in", module: "relationship", icon: HeartHandshake }
];

const kindLabels: Record<QuickParseResult["kind"], string> = {
  event: "Calendar event",
  task: "Task",
  grocery: "Grocery item",
  transaction: "Expense",
  note: "Family note",
  memory: "Memory"
};

export function QuickAddSheet({ open, onOpenChange }: QuickAddSheetProps) {
  const router = useRouter();
  const { createRecord, currentMemberId, currentMember } = useAppData();
  const { members } = useFamilyMembers();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [structured, setStructured] = useState<(typeof structuredItems)[number] | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);

  const parsed = useMemo(() => (text.trim() ? quickParse(text, members) : null), [members, text]);
  const visibleStructured = useMemo(
    () => structuredItems.filter((item) => memberCanAccessPath(currentMember, moduleConfigs[item.module].route)),
    [currentMember]
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setExampleIndex((index) => (index + 1) % quickExamples.length), 2600);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setText("");
      setSaving(false);
    }
  }, [open]);

  async function commit() {
    if (!parsed || saving) return;
    setSaving(true);
    try {
      const assignee = parsed.memberId ?? null;
      let route = "/today";
      if (parsed.kind === "event") {
        const start = parsed.hasTime && parsed.date ? parsed.date : new Date(`${parsed.date}T09:00:00`).toISOString();
        await createRecord("events", {
          title: parsed.title,
          category: "Family",
          start_at: start,
          end_at: null,
          all_day: !parsed.hasTime,
          location: null,
          description: null,
          recurrence_rule: null,
          assigned_to: assignee,
          created_by: currentMemberId
        });
        route = "/calendar";
      } else if (parsed.kind === "task") {
        await createRecord("tasks", {
          title: parsed.title,
          category: "Household",
          priority: "medium",
          status: "not_started",
          assigned_to: assignee ?? currentMemberId,
          due_at: parsed.date ? (parsed.hasTime ? parsed.date : new Date(`${parsed.date}T00:00:00`).toISOString()) : null,
          created_by: currentMemberId,
          tags: [],
          notes: null,
          description: null,
          repeat_rule: null,
          completed_at: null
        });
        route = "/tasks";
      } else if (parsed.kind === "grocery") {
        const names = parsed.title
          .split(/,|\band\b/i)
          .map((part) => part.trim())
          .filter(Boolean);
        await Promise.all(
          names.map((name) =>
            createRecord("grocery_items", {
              name: name.charAt(0).toUpperCase() + name.slice(1),
              category: "Other",
              quantity: "1",
              unit: null,
              store: null,
              needed_by: null,
              checked: false,
              added_by: currentMemberId
            })
          )
        );
        route = "/grocery";
      } else if (parsed.kind === "transaction") {
        await createRecord("financial_transactions", {
          transaction_date: parsed.date ?? format(new Date(), "yyyy-MM-dd"),
          account_name: "Checking",
          transaction_type: "expense",
          category: "Other",
          description: parsed.title,
          amount: parsed.amount ?? 0,
          cleared: false,
          recurring: false,
          owner_name: null,
          notes: null,
          tags: ["quick add"],
          created_by: currentMemberId
        });
        route = "/budget";
      } else if (parsed.kind === "note") {
        await createRecord("communication_notes", {
          title: parsed.title,
          message: parsed.title,
          category: "Reminder",
          importance: "medium",
          related_date: parsed.date ? parsed.date.slice(0, 10) : null,
          visible_to: null,
          acknowledged_by: [],
          created_by: currentMemberId,
          pinned: false
        });
        route = "/communication";
      } else if (parsed.kind === "memory") {
        await createRecord("journal_entries", {
          entry_date: parsed.date ?? format(new Date(), "yyyy-MM-dd"),
          title: parsed.title,
          body: null,
          author_id: currentMemberId,
          people: assignee ? [assignee] : [],
          tags: [],
          mood: null,
          highlight: false
        });
        route = "/memories";
      }

      toast({ title: "Added", description: parsed.summary.replace(/^Add |^Log |^Post |^Save /, ""), variant: "success" });
      onOpenChange(false);
      router.push(route);
    } catch (error) {
      toast({ title: "Could not add", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const config = structured ? moduleConfigs[structured.module] : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl gap-5 p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Wand2 className="h-5 w-5 text-primary" />
              Quick add
            </DialogTitle>
            <DialogDescription>Type it like you would say it. We will figure out what it is.</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void commit();
            }}
          >
            <Input
              autoFocus
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={quickExamples[exampleIndex]}
              className="h-14 rounded-2xl text-base"
              aria-label="Quick add"
            />
            {parsed ? (
              <div className="pop-in flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-3">
                <div className="min-w-0 flex items-center gap-3">
                  {parsed.memberId ? <MemberAvatar memberId={parsed.memberId} size="md" /> : null}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{kindLabels[parsed.kind]}</p>
                    <p className="truncate text-sm text-foreground">{parsed.summary}</p>
                  </div>
                </div>
                <Button type="submit" disabled={saving} className="shrink-0">
                  {saving ? "Adding" : "Add"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="px-1 text-xs text-muted-foreground">
                Try “Dentist for Lily tomorrow 3pm”, “Buy milk”, “$42 gas”, or “Memory: first lost tooth”.
              </p>
            )}
          </form>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Or open a full form</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleStructured.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setStructured(item);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border border-border/80 bg-white/70 px-3 py-2.5 text-left text-sm font-medium transition-all hover:border-primary/40 hover:bg-white focus-ring dark:bg-white/5 dark:hover:bg-white/10"
                    )}
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {config ? (
        <RecordFormDialog config={config} open={Boolean(structured)} defaultOverrides={structured?.defaults} onOpenChange={(isOpen) => !isOpen && setStructured(null)} />
      ) : null}
    </>
  );
}
