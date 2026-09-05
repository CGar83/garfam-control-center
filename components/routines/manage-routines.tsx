"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { MemberAvatar } from "@/components/app/member-avatar";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { moduleConfigs } from "@/lib/modules";
import { paletteForMember } from "@/lib/member-colors";
import { weekdayLabels } from "@/lib/options";
import type { FamilyMember, Routine } from "@/lib/types";
import { cn } from "@/lib/utils";
import { memberFirstName, routineTemplates, timeOfDayMeta, type RoutineTemplate } from "./helpers";

interface ManageRoutinesProps {
  members: FamilyMember[];
  routines: Routine[];
  selectedMemberId: string | null;
  onToggleActive: (routine: Routine) => void;
  onDelete: (routine: Routine) => Promise<void>;
  onAddTemplate: (template: RoutineTemplate) => Promise<void>;
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
  editing: Routine | null;
  onEditingChange: (routine: Routine | null) => void;
}

function daysLabel(routine: Routine) {
  const days = routine.days_of_week ?? [];
  if (days.length === 0 || days.length === 7) return "Every day";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) return "Weekdays";
  return days.map((day) => weekdayLabels[day]).join(" ");
}

export function ManageRoutines({ members, routines, selectedMemberId, onToggleActive, onDelete, onAddTemplate, formOpen, onFormOpenChange, editing, onEditingChange }: ManageRoutinesProps) {
  const [deleting, setDeleting] = useState<Routine | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const selected = members.find((member) => member.id === selectedMemberId) ?? null;
  const defaultOverrides = useMemo(() => ({ member_id: selectedMemberId ?? "" }), [selectedMemberId]);
  const existingTitles = new Set(routines.map((routine) => `${routine.member_id ?? ""}:${routine.title.trim().toLowerCase()}`));

  return (
    <div className="app-section">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Manage routines</h3>
          <p className="text-sm text-muted-foreground">Edit steps, pause a routine, or start from a template.</p>
        </div>
        <Button onClick={() => onFormOpenChange(true)}>
          <Plus className="h-4 w-4" />
          Add routine
        </Button>
      </div>

      <Card className="border-[#ACE1AF]/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Starter templates
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {selected ? `One tap adds it for ${memberFirstName(selected)}. Pick a different person above to add it for them.` : "One tap adds a whole-family routine. Pick a person above to add it just for them."}
          </p>
        </CardHeader>
        <CardContent className="grid-auto-fit-sm pt-0">
          {routineTemplates.map((template) => {
            const ownerId = template.personal ? selectedMemberId : (selectedMemberId ?? null);
            const exists = existingTitles.has(`${ownerId ?? ""}:${template.title.toLowerCase()}`);
            return (
              <div key={template.key} className="record-tile flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-lg" aria-hidden>
                    {template.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{template.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {timeOfDayMeta[template.time_of_day].label} · {template.steps.length} steps
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{template.steps.join(" → ")}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto"
                  disabled={exists || adding === template.key}
                  onClick={async () => {
                    setAdding(template.key);
                    try {
                      await onAddTemplate(template);
                    } finally {
                      setAdding(null);
                    }
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {exists ? "Already added" : "Add"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {routines.length > 0 ? (
        <div className="surface-panel divide-y divide-border/70">
          {routines.map((routine) => {
            const member = members.find((item) => item.id === routine.member_id) ?? null;
            const palette = paletteForMember(member, members);
            return (
              <div key={routine.id} className={cn("flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap", !routine.active && "opacity-60")}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl" aria-hidden>
                  {routine.emoji ?? "✅"}
                </span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-semibold">{routine.title}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 font-medium" style={{ backgroundColor: palette.soft, color: palette.ink }}>
                      <MemberAvatar member={member} size="xs" />
                      {member ? memberFirstName(member) : "Family"}
                    </span>
                    <span>{daysLabel(routine)}</span>
                    <span>· {timeOfDayMeta[routine.time_of_day].label}</span>
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {routine.steps.length} steps
                </Badge>
                <button
                  type="button"
                  role="switch"
                  aria-checked={routine.active}
                  aria-label={`${routine.active ? "Pause" : "Resume"} ${routine.title}`}
                  onClick={() => onToggleActive(routine)}
                  className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors focus-ring", routine.active ? "bg-emerald-500" : "bg-muted-foreground/30")}
                >
                  <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", routine.active ? "left-6" : "left-1")} />
                </button>
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${routine.title}`} onClick={() => onEditingChange(routine)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${routine.title}`} onClick={() => setDeleting(routine)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <RecordFormDialog config={moduleConfigs.routines} open={formOpen} onOpenChange={onFormOpenChange} defaultOverrides={defaultOverrides} />
      <RecordFormDialog config={moduleConfigs.routines} record={editing} open={Boolean(editing)} onOpenChange={(open) => !open && onEditingChange(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this routine?"
        description="The checklist goes away for good. Past completions stay in the history."
        onConfirm={async () => {
          if (deleting) await onDelete(deleting);
        }}
      />
    </div>
  );
}
