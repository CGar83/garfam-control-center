"use client";

import { useState } from "react";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { MemberAvatar } from "@/components/app/member-avatar";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMemberAge } from "@/lib/family-members";
import { moduleConfigs } from "@/lib/modules";
import { paletteForMember } from "@/lib/member-colors";
import { weekdayLabels } from "@/lib/options";
import type { Chore, FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { frequencyLabel, memberFirstName, starterChoresForAge, timeOfDayLabel, type StarterChore } from "./helpers";

interface ManageTabProps {
  members: FamilyMember[];
  kids: FamilyMember[];
  chores: Chore[];
  onToggleActive: (chore: Chore) => void;
  onDelete: (chore: Chore) => Promise<void>;
  onAddStarter: (kid: FamilyMember, starter: StarterChore) => Promise<void>;
}

function daysLabel(chore: Chore) {
  if (chore.frequency === "custom" || chore.frequency === "weekly") {
    const days = chore.days_of_week ?? [];
    if (days.length === 0) return chore.frequency === "weekly" ? "Sun" : "Any day";
    return days.map((day) => weekdayLabels[day]).join(" ");
  }
  return frequencyLabel[chore.frequency];
}

export function ManageTab({ members, kids, chores, onToggleActive, onDelete, onAddStarter }: ManageTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Chore | null>(null);
  const [deleting, setDeleting] = useState<Chore | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const sorted = [...chores].sort((a, b) => {
    const aIndex = members.findIndex((member) => member.id === a.assigned_to);
    const bIndex = members.findIndex((member) => member.id === b.assigned_to);
    if (aIndex !== bIndex) return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    return a.title.localeCompare(b.title);
  });

  const existingTitles = new Set(chores.map((chore) => `${chore.assigned_to ?? ""}:${chore.title.trim().toLowerCase()}`));

  const addButton = (
    <Button onClick={() => setFormOpen(true)}>
      <Plus className="h-4 w-4" />
      Add chore
    </Button>
  );

  return (
    <div className="app-section">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">All chores</h3>
          <p className="text-sm text-muted-foreground">Turn a chore off to pause it without losing its history.</p>
        </div>
        {addButton}
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="No chores yet" description="Add a first chore, assign it, and it shows up on that person's Today view." action={addButton} />
      ) : (
        <div className="surface-panel divide-y divide-border/70">
          {sorted.map((chore) => {
            const member = members.find((item) => item.id === chore.assigned_to) ?? null;
            const palette = paletteForMember(member, members);
            return (
              <div key={chore.id} className={cn("flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap", !chore.active && "opacity-60")}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl" aria-hidden>
                  {chore.emoji ?? "🧹"}
                </span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-semibold">{chore.title}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 font-medium" style={{ backgroundColor: palette.soft, color: palette.ink }}>
                      <MemberAvatar member={member} size="xs" />
                      {member ? memberFirstName(member) : "Anyone"}
                    </span>
                    <span>{daysLabel(chore)}</span>
                    <span>· {timeOfDayLabel[chore.time_of_day]}</span>
                  </p>
                </div>
                <Badge variant={chore.points > 0 ? "warning" : "outline"} className="shrink-0 tabular-nums">
                  {chore.points} pts
                </Badge>
                <button
                  type="button"
                  role="switch"
                  aria-checked={chore.active}
                  aria-label={`${chore.active ? "Pause" : "Resume"} ${chore.title}`}
                  onClick={() => onToggleActive(chore)}
                  className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors focus-ring", chore.active ? "bg-emerald-500" : "bg-muted-foreground/30")}
                >
                  <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", chore.active ? "left-6" : "left-1")} />
                </button>
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${chore.title}`} onClick={() => setEditing(chore)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${chore.title}`} onClick={() => setDeleting(chore)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {kids.length > 0 ? (
        <Card className="border-[#ACE1AF]/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Starter chores
            </CardTitle>
            <p className="text-sm text-muted-foreground">Age-appropriate suggestions for each kid. One tap adds it to their list.</p>
          </CardHeader>
          <CardContent className="grid-auto-fit-sm pt-0">
            {kids.map((kid) => {
              const palette = paletteForMember(kid, members);
              const age = getMemberAge(kid);
              const starters = starterChoresForAge(age).filter((starter) => !existingTitles.has(`${kid.id}:${starter.title.toLowerCase()}`));
              return (
                <div key={kid.id} className="record-tile border-l-4" style={{ borderLeftColor: palette.solid }}>
                  <div className="flex items-center gap-2">
                    <MemberAvatar member={kid} size="sm" />
                    <p className="text-sm font-semibold">{memberFirstName(kid)}</p>
                    <span className="text-xs text-muted-foreground">{age !== null ? `age ${age}` : "age not set"}</span>
                  </div>
                  {starters.length === 0 ? (
                    <p className="mt-3 text-xs text-muted-foreground">All starter chores added. Nice.</p>
                  ) : (
                    <ul className="mt-3 space-y-1.5">
                      {starters.map((starter) => {
                        const key = `${kid.id}:${starter.title}`;
                        return (
                          <li key={key} className="flex items-center gap-2 text-sm">
                            <span aria-hidden>{starter.emoji}</span>
                            <span className="min-w-0 flex-1 truncate">{starter.title}</span>
                            <span className="text-xs text-muted-foreground">{starter.points} pts</span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={adding === key}
                              onClick={async () => {
                                setAdding(key);
                                try {
                                  await onAddStarter(kid, starter);
                                } finally {
                                  setAdding(null);
                                }
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <RecordFormDialog config={moduleConfigs.chores} open={formOpen} onOpenChange={setFormOpen} />
      <RecordFormDialog config={moduleConfigs.chores} record={editing} open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this chore?"
        description="The chore and its place on the chart go away. Points already earned stay with the kid."
        onConfirm={async () => {
          if (deleting) await onDelete(deleting);
        }}
      />
    </div>
  );
}
