"use client";

import { useMemo, useState } from "react";
import { CalendarHeart, Plus, Search, Star } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { MemberAvatar, MemberChip } from "@/components/app/member-avatar";
import { PageHeader } from "@/components/app/page-header";
import { useAppData } from "@/components/app/providers";
import { CountdownRow } from "@/components/memories/countdown-row";
import { buildCountdowns, entryMatchesSearch, groupEntriesByMonth, onThisDayEntries, yearInReview } from "@/components/memories/helpers";
import { MemoryCard } from "@/components/memories/memory-card";
import { OnThisDayCard } from "@/components/memories/on-this-day";
import { QuickCapture } from "@/components/memories/quick-capture";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { useToast } from "@/hooks/use-toast";
import { moduleConfigs } from "@/lib/modules";
import type { JournalEntry, Milestone } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "highlights";

export default function MemoriesPage() {
  const { updateRecord, deleteRecord, currentMember, currentMemberId } = useAppData();
  const { members } = useFamilyMembers();
  const { toast } = useToast();
  const entries = useRealtimeTable("journal_entries") as JournalEntry[];
  const milestones = useRealtimeTable("milestones") as Milestone[];
  const isParent = !currentMember || currentMember.role !== "viewer";

  const [filter, setFilter] = useState<Filter>("all");
  const [personId, setPersonId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [milestoneDialog, setMilestoneDialog] = useState<{ open: boolean; record: Milestone | null }>({ open: false, record: null });
  const [entryDialog, setEntryDialog] = useState<{ open: boolean; record: JournalEntry | null }>({ open: false, record: null });
  const [pendingDelete, setPendingDelete] = useState<{ kind: "milestone"; record: Milestone } | { kind: "entry"; record: JournalEntry } | null>(null);

  const today = useMemo(() => new Date(), []);
  const countdowns = useMemo(() => buildCountdowns(milestones, today), [milestones, today]);
  const onThisDay = useMemo(() => onThisDayEntries(entries, today), [entries, today]);
  const stats = useMemo(() => yearInReview(entries, members, today), [entries, members, today]);

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        if (filter === "highlights" && !entry.highlight) return false;
        if (personId && !(entry.people ?? []).includes(personId) && entry.author_id !== personId) return false;
        return entryMatchesSearch(entry, search);
      }),
    [entries, filter, personId, search]
  );
  const groups = useMemo(() => groupEntriesByMonth(filtered), [filtered]);
  const filtersActive = filter !== "all" || personId !== null || search.trim().length > 0;

  function canManageEntry(entry: JournalEntry) {
    return isParent || (currentMemberId !== null && entry.author_id === currentMemberId);
  }

  async function toggleHighlight(entry: JournalEntry) {
    try {
      await updateRecord("journal_entries", entry.id, { highlight: !entry.highlight });
      if (!entry.highlight) toast({ title: "Added to highlights", description: "It will show up in the year in review.", variant: "success" });
    } catch (error) {
      toast({ title: "Could not update", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.kind === "milestone") await deleteRecord("milestones", pendingDelete.record.id);
      else await deleteRecord("journal_entries", pendingDelete.record.id);
      toast({ title: "Deleted", variant: "default" });
    } catch (error) {
      toast({ title: "Could not delete", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  }

  return (
    <div className="app-page">
      <PageHeader
        title="Memories"
        description="Countdowns to the big days and the small moments worth keeping."
        action={
          isParent ? (
            <Button onClick={() => setMilestoneDialog({ open: true, record: null })}>
              <Plus className="h-4 w-4" />
              Add countdown
            </Button>
          ) : undefined
        }
      />

      <section className="app-section fade-up">
        <div className="flex items-center gap-2">
          <CalendarHeart className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Coming up</h2>
          {countdowns.length > 0 ? <span className="text-xs text-muted-foreground">{countdowns.length} in the next year</span> : null}
        </div>
        {countdowns.length === 0 && !isParent ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">Nothing to count down to yet. Ask a parent to add a birthday or trip.</CardContent>
          </Card>
        ) : (
          <CountdownRow
            items={countdowns}
            isParent={isParent}
            onAdd={() => setMilestoneDialog({ open: true, record: null })}
            onEdit={(record) => setMilestoneDialog({ open: true, record })}
            onDelete={(record) => setPendingDelete({ kind: "milestone", record })}
          />
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <QuickCapture />
        <OnThisDayCard entries={onThisDay} today={today} />
      </section>

      <section className="app-section">
        <div className="fade-up fade-up-delay-2 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="surface-panel flex flex-col items-start p-3 sm:p-4">
            <span className="text-2xl font-bold leading-none sm:text-3xl">{stats.total}</span>
            <span className="mt-1.5 text-xs text-muted-foreground">memories in {stats.year}</span>
          </div>
          <div className="surface-panel flex flex-col items-start p-3 sm:p-4">
            <span className="flex items-center gap-1 text-2xl font-bold leading-none sm:text-3xl">
              {stats.highlights}
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </span>
            <span className="mt-1.5 text-xs text-muted-foreground">highlights</span>
          </div>
          <div className="surface-panel flex flex-col items-start p-3 sm:p-4">
            {stats.topPerson ? (
              <span className="flex items-center gap-2 text-base font-bold leading-none sm:text-lg">
                <MemberAvatar member={stats.topPerson} size="sm" />
                <span className="truncate">{stats.topPerson.display_name.split(" ")[0]}</span>
              </span>
            ) : (
              <span className="text-2xl font-bold leading-none sm:text-3xl">—</span>
            )}
            <span className="mt-1.5 text-xs text-muted-foreground">{stats.topPerson ? `in ${stats.topPersonCount} ${stats.topPersonCount === 1 ? "memory" : "memories"}` : "most tagged"}</span>
          </div>
        </div>

        <div className="fade-up fade-up-delay-3 flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search memories" aria-label="Search memories" className="pl-9" />
            </div>
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar" role="group" aria-label="Filter memories">
            {(
              [
                ["all", "All"],
                ["highlights", "Highlights"]
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-all focus-ring",
                  filter === value ? "border-transparent bg-foreground text-background shadow-sm" : "border-border bg-white/70 text-muted-foreground hover:border-foreground/20 dark:bg-white/5"
                )}
              >
                {value === "highlights" ? <Star className="h-3.5 w-3.5" /> : null}
                {label}
              </button>
            ))}
            <span className="mx-1 w-px shrink-0 self-stretch bg-border" aria-hidden />
            {members.map((member) => (
              <MemberChip key={member.id} member={member} active={personId === member.id} onClick={() => setPersonId(personId === member.id ? null : member.id)} />
            ))}
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState title="No memories saved yet" description="Capture one small moment from today using the box above. It takes ten seconds." />
        ) : groups.length === 0 ? (
          <EmptyState
            title="Nothing matches"
            description="Try a different word or clear the filters."
            action={
              filtersActive ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilter("all");
                    setPersonId(null);
                    setSearch("");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h3>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                  <span className="text-xs text-muted-foreground">{group.entries.length}</span>
                </div>
                {group.entries.map((entry) => (
                  <MemoryCard
                    key={entry.id}
                    entry={entry}
                    canManage={canManageEntry(entry)}
                    showYear={group.key.slice(0, 4) !== String(today.getFullYear())}
                    onToggleHighlight={(record) => void toggleHighlight(record)}
                    onEdit={(record) => setEntryDialog({ open: true, record })}
                    onDelete={(record) => setPendingDelete({ kind: "entry", record })}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <RecordFormDialog
        config={moduleConfigs.milestones}
        open={milestoneDialog.open}
        onOpenChange={(open) => setMilestoneDialog((current) => ({ open, record: open ? current.record : null }))}
        record={milestoneDialog.record}
      />
      <RecordFormDialog
        config={moduleConfigs.journal}
        open={entryDialog.open}
        onOpenChange={(open) => setEntryDialog((current) => ({ open, record: open ? current.record : null }))}
        record={entryDialog.record}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pendingDelete?.kind === "milestone" ? "Delete this countdown?" : "Delete this memory?"}
        description={pendingDelete?.kind === "milestone" ? `"${pendingDelete.record.title}" will be removed from the countdown row.` : `"${pendingDelete?.record.title ?? ""}" will be gone for good.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
