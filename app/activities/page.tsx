"use client";

import { useMemo, useState } from "react";
import { addDays, addMinutes, setHours, setMinutes, startOfDay } from "date-fns";
import { CalendarPlus, Clock, DollarSign, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { PersonAvatar } from "@/components/app/person-avatar";
import { StatusBadge } from "@/components/app/status-badge";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { useAppData } from "@/components/app/providers";
import { useToast } from "@/hooks/use-toast";
import { activityAudiences } from "@/lib/options";
import { moduleConfigs } from "@/lib/modules";
import type { ActivityAudience, ActivityIdea } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const audienceDescriptions: Record<ActivityAudience, string> = {
  son: "One-on-one ideas for father-son or mother-son time.",
  daughter: "One-on-one ideas for father-daughter or mother-daughter time.",
  all_kids: "Shared kid activities that work for siblings.",
  date_night: "Marriage/date-night ideas that can be protected on the calendar.",
  family: "Whole-family outings, traditions, and at-home rituals."
};

function nextSlot(audience: ActivityAudience) {
  const now = new Date();
  const targetDay = audience === "date_night" ? 5 : 6;
  const hour = audience === "date_night" ? 19 : 10;
  const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
  return setMinutes(setHours(addDays(startOfDay(now), daysUntil), hour), 0);
}

function eventDescription(activity: ActivityIdea) {
  return [
    activity.description,
    activity.supplies ? `Supplies: ${activity.supplies}` : null,
    activity.notes ? `Notes: ${activity.notes}` : null,
    `Audience: ${titleCase(activity.audience)}`
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function ActivitiesPage() {
  const { data, createRecord, updateRecord, deleteRecord, currentMemberId } = useAppData();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityIdea | null>(null);
  const [deleting, setDeleting] = useState<ActivityIdea | null>(null);
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<ActivityAudience | "all">("all");
  const records = data.activity_ideas;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((activity) => {
      const matchesAudience = audience === "all" || activity.audience === audience;
      const haystack = [activity.title, activity.category, activity.description, activity.location, activity.supplies, activity.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesAudience && (!normalized || haystack.includes(normalized));
    });
  }, [audience, query, records]);

  async function scheduleActivity(activity: ActivityIdea) {
    const start = nextSlot(activity.audience);
    const duration = activity.duration_minutes ?? (activity.audience === "date_night" ? 150 : 90);
    const end = addMinutes(start, duration);
    const event = await createRecord("events", {
      title: activity.audience === "date_night" ? `Date night: ${activity.title}` : activity.title,
      description: eventDescription(activity),
      category: "Family",
      location: activity.location,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: false,
      recurrence_rule: null,
      assigned_to: activity.assigned_to,
      created_by: currentMemberId
    });

    await updateRecord("activity_ideas", activity.id, {
      status: "planned",
      scheduled_event_id: event.id
    });

    toast({ title: "Added to calendar", description: `${activity.title} is scheduled on the family calendar.`, variant: "success" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        description="Ideas for intentional time with your son, daughter, the whole family, and date nights. Schedule an idea straight into the family calendar."
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Activity Idea
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-5">
        {activityAudiences.map((item) => (
          <Card key={item} className={audience === item ? "border-primary" : undefined}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-sm">
                {titleCase(item)}
                <Badge variant="outline">{records.filter((record) => record.audience === item).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="min-h-12 text-xs leading-5 text-muted-foreground">{audienceDescriptions[item]}</p>
              <Button className="mt-3 w-full" size="sm" variant={audience === item ? "default" : "outline"} onClick={() => setAudience(item)}>
                View
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border bg-white/70 p-3 shadow-[var(--shadow-subtle)] backdrop-blur-xl dark:bg-card/70">
        <div className="grid gap-2 md:grid-cols-[1fr_14rem_auto]">
          <Input aria-label="Search activities" placeholder="Search activities, locations, supplies..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select value={audience} onValueChange={(value) => setAudience(value as ActivityAudience | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All audiences</SelectItem>
              {activityAudiences.map((item) => (
                <SelectItem key={item} value={item}>
                  {titleCase(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setAudience("all")}>
            Reset
          </Button>
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((activity) => (
            <Card key={activity.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{titleCase(activity.audience)}</Badge>
                      <Badge variant={activity.indoor ? "secondary" : "info"}>{activity.indoor ? "Indoor" : "Outdoor"}</Badge>
                    </div>
                    <CardTitle className="mt-3 leading-tight">{activity.title}</CardTitle>
                  </div>
                  <StatusBadge status={activity.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activity.description ? <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{activity.description}</p> : null}
                <div className="grid gap-2 text-sm text-muted-foreground">
                  {activity.location ? (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {activity.location}
                    </span>
                  ) : null}
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {activity.duration_minutes ? `${activity.duration_minutes} minutes` : "Flexible timing"}
                  </span>
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {activity.estimated_cost ? Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(activity.estimated_cost) : "Free or flexible"}
                  </span>
                  {activity.assigned_to ? <PersonAvatar personId={activity.assigned_to} size="sm" /> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => scheduleActivity(activity)}>
                    <CalendarPlus className="h-4 w-4" />
                    Add to Calendar
                  </Button>
                  {activity.status !== "done" ? (
                    <Button variant="outline" onClick={() => updateRecord("activity_ideas", activity.id, { status: "done" })}>
                      Done
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon" onClick={() => setEditing(activity)} title="Edit activity">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit activity</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(activity)} title="Delete activity">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete activity</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No activity ideas found"
          description="Add a date night, one-on-one kid activity, or whole-family idea."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Activity Idea
            </Button>
          }
        />
      )}

      <RecordFormDialog config={moduleConfigs.activities} open={formOpen} onOpenChange={setFormOpen} />
      <RecordFormDialog config={moduleConfigs.activities} record={editing} open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this activity idea?"
        description="This removes the idea from the family activity list. Calendar events already created from it will remain."
        onConfirm={async () => {
          if (!deleting) return;
          await deleteRecord("activity_ideas", deleting.id);
          toast({ title: "Activity deleted", variant: "success" });
        }}
      />
    </div>
  );
}
