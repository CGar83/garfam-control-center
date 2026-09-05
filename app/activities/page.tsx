"use client";

import { useMemo, useState } from "react";
import { addDays, addMinutes, setHours, setMinutes, startOfDay } from "date-fns";
import { ArrowDownToLine, CalendarPlus, Clock, DollarSign, GripVertical, MapPin, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useToast } from "@/hooks/use-toast";
import { childAudience, getMemberAge, isChildMember } from "@/lib/family-members";
import { activityAudiences } from "@/lib/options";
import { moduleConfigs } from "@/lib/modules";
import type { ActivityAudience, ActivityIdea } from "@/lib/types";
import { cn, titleCase } from "@/lib/utils";

const audienceDescriptions: Record<ActivityAudience, string> = {
  son: "One-on-one ideas for father-son or mother-son time.",
  daughter: "One-on-one ideas for father-daughter or mother-daughter time.",
  all_kids: "Shared kid activities that work for siblings.",
  date_night: "Marriage/date-night ideas that can be protected on the calendar.",
  family: "Whole-family outings, traditions, and at-home rituals."
};

type ActivitySuggestion = Omit<
  ActivityIdea,
  "id" | "family_id" | "created_at" | "updated_at" | "status" | "scheduled_event_id" | "created_by"
> & {
  id: string;
  reason: string;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function childSuggestionSet(children: ReturnType<typeof useFamilyMembers>["children"]): ActivitySuggestion[] {
  const suggestions = children.flatMap((child) => {
    const age = getMemberAge(child);
    const name = firstName(child.display_name);
    const audience = childAudience(child);

    if (age !== null && age <= 6) {
      return [
        {
          id: `suggestion-${child.id}-park-story`,
          title: `${name}'s park and story hour`,
          category: "Outdoor",
          audience,
          description: "Choose a playground, bring one short book, and let the child pick the snack stop afterward.",
          location: "Favorite neighborhood park",
          estimated_cost: 12,
          duration_minutes: 75,
          season: "Anytime",
          indoor: false,
          supplies: "Book, snack, water bottle",
          assigned_to: child.id,
          notes: "Best when the plan stays short and concrete.",
          reason: `${name} looks like an early-childhood profile, so this keeps timing simple and sensory-friendly.`
        }
      ];
    }

    if (age !== null && age <= 10) {
      return [
        {
          id: `suggestion-${child.id}-creative-cafe`,
          title: `${name}'s creative cafe date`,
          category: "Creative",
          audience,
          description: "Bring sketchbooks or a simple craft kit, work side by side, then let the child explain their favorite part.",
          location: "Cafe, library, or kitchen table",
          estimated_cost: 18,
          duration_minutes: 90,
          season: "Rainy Day",
          indoor: true,
          supplies: "Sketchbook, pencils, simple craft kit",
          assigned_to: child.id,
          notes: "Make the point attention, not output quality.",
          reason: `${name}'s age is a fit for hands-on attention with a clear beginning and end.`
        },
        {
          id: `suggestion-${child.id}-choice-walk`,
          title: `${name}'s choose-the-route walk`,
          category: "Outdoor",
          audience,
          description: "Give the child control of the route for a short walk and ask three curiosity questions along the way.",
          location: "Neighborhood",
          estimated_cost: 0,
          duration_minutes: 45,
          season: "Anytime",
          indoor: false,
          supplies: "Comfortable shoes",
          assigned_to: child.id,
          notes: "Let the child lead. Keep corrections minimal.",
          reason: `${name} is old enough to enjoy ownership without the outing needing much planning.`
        }
      ];
    }

    if (age !== null && age <= 13) {
      return [
        {
          id: `suggestion-${child.id}-skills-lunch`,
          title: `${name}'s skill and lunch block`,
          category: "Learning",
          audience,
          description: "Let the child pick one practical skill to learn together, then go to lunch or make lunch together at home.",
          location: "Home or local lunch spot",
          estimated_cost: 30,
          duration_minutes: 120,
          season: "Anytime",
          indoor: true,
          supplies: "Simple project supplies",
          assigned_to: child.id,
          notes: "Ask what skill would feel useful or fun this month.",
          reason: `${name} looks middle-school aged, so this blends independence, usefulness, and one-on-one time.`
        },
        {
          id: `suggestion-${child.id}-active-reset`,
          title: `${name}'s active reset`,
          category: "Sports",
          audience,
          description: "Pick basketball, batting cages, a bike ride, or a climbing gym, then debrief over a snack.",
          location: "Local activity spot",
          estimated_cost: 35,
          duration_minutes: 90,
          season: "Anytime",
          indoor: false,
          supplies: "Water, comfortable shoes, snack",
          assigned_to: child.id,
          notes: "Keep competition light and connection high.",
          reason: `${name}'s age is a fit for movement plus casual conversation.`
        }
      ];
    }

    if (age !== null) {
      return [
        {
          id: `suggestion-${child.id}-teen-drive`,
          title: `${name}'s coffee and real-talk drive`,
          category: "Food",
          audience,
          description: "Take a low-pressure drive or coffee stop and let the teen choose the music and topic boundaries.",
          location: "Coffee shop or scenic drive",
          estimated_cost: 20,
          duration_minutes: 75,
          season: "Anytime",
          indoor: true,
          supplies: "Car keys, coffee budget",
          assigned_to: child.id,
          notes: "Ask permission before advice. Listen first.",
          reason: `${name} appears teen-aged, so this protects autonomy while creating space to talk.`
        }
      ];
    }

    return [
      {
        id: `suggestion-${child.id}-one-on-one`,
        title: `${name}'s one-on-one choice block`,
        category: "Family",
        audience,
        description: "Set aside a parent-child block where the child chooses between three parent-approved options.",
        location: "Flexible",
        estimated_cost: 20,
        duration_minutes: 90,
        season: "Anytime",
        indoor: true,
        supplies: "Three simple options",
        assigned_to: child.id,
        notes: "Add birthdate or age label for sharper suggestions.",
        reason: `${name} has no age set yet, so this stays flexible.`
      }
    ];
  });

  const sharedKidSuggestion: ActivitySuggestion | null =
    children.length >= 2
      ? {
          id: "suggestion-all-kids-sibling-mission",
          title: "Sibling mission night",
          category: "At Home",
          audience: "all_kids",
          description: "Give the kids one shared mission: build dinner, design a blanket fort movie night, or make a short family quiz.",
          location: "Home",
          estimated_cost: 25,
          duration_minutes: 120,
          season: "Anytime",
          indoor: true,
          supplies: "Simple dinner ingredients or movie supplies",
          assigned_to: null,
          notes: "Parents act as light support, not project managers.",
          reason: "Multiple kids are on the family profile, so this uses sibling energy instead of only one-on-one time."
        }
      : null;

  return sharedKidSuggestion ? [...suggestions, sharedKidSuggestion] : suggestions;
}

const standingSuggestions: ActivitySuggestion[] = [
  {
    id: "suggestion-date-night-walk-reservation",
    title: "Phone-free dinner and walk",
    category: "Date Night",
    audience: "date_night",
    description: "Book a simple dinner, leave logistics for the last ten minutes only, and take a short walk afterward.",
    location: "Favorite local restaurant",
    estimated_cost: 85,
    duration_minutes: 150,
    season: "Anytime",
    indoor: true,
    supplies: "Reservation, sitter plan if needed",
    assigned_to: null,
    notes: "Protect the first hour for connection, not administration.",
    reason: "Date nights should be protected calendar time, not leftover time."
  },
  {
    id: "suggestion-family-sunday-reset",
    title: "Sunday family reset",
    category: "At Home",
    audience: "family",
    description: "Spend 30 minutes resetting backpacks, meals, calendar, and one fun thing each person wants this week.",
    location: "Kitchen table",
    estimated_cost: 0,
    duration_minutes: 45,
    season: "Anytime",
    indoor: true,
    supplies: "Calendar, snacks, school bags",
    assigned_to: null,
    notes: "End with the fun item so it does not feel like a chores meeting.",
    reason: "A weekly family reset ties calendar, school, meals, and emotional tone together."
  },
  {
    id: "suggestion-family-breakfast-walk",
    title: "Breakfast walk and library stop",
    category: "Food",
    audience: "family",
    description: "Walk or drive to breakfast, then stop by the library or park before heading home.",
    location: "Local breakfast spot",
    estimated_cost: 60,
    duration_minutes: 120,
    season: "Anytime",
    indoor: false,
    supplies: "Library cards, light jackets",
    assigned_to: null,
    notes: "Keep it easy enough to repeat monthly.",
    reason: "Whole-family outings work best when they are repeatable and low-friction."
  }
];

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

function matchesActivityFilter(activity: Pick<ActivityIdea, "audience" | "title" | "category" | "description" | "location" | "supplies" | "notes">, query: string, audience: ActivityAudience | "all") {
  const normalized = query.trim().toLowerCase();
  const matchesAudience = audience === "all" || activity.audience === audience;
  const haystack = [activity.title, activity.category, activity.description, activity.location, activity.supplies, activity.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return matchesAudience && (!normalized || haystack.includes(normalized));
}

export default function ActivitiesPage() {
  const { data, createRecord, updateRecord, deleteRecord, currentMemberId } = useAppData();
  const { children } = useFamilyMembers();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityIdea | null>(null);
  const [deleting, setDeleting] = useState<ActivityIdea | null>(null);
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<ActivityAudience | "all">("all");
  const [draggingSuggestion, setDraggingSuggestion] = useState<ActivitySuggestion | null>(null);
  const records = data.activity_ideas;

  const suggestions = useMemo(() => {
    const existingTitles = new Set(records.map((activity) => activity.title.trim().toLowerCase()));
    const childProfiles = children.length ? children : data.family_members.filter(isChildMember);

    return [...childSuggestionSet(childProfiles), ...standingSuggestions].filter((suggestion) => !existingTitles.has(suggestion.title.trim().toLowerCase()));
  }, [children, data.family_members, records]);

  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => matchesActivityFilter(suggestion, query, audience)).slice(0, 8),
    [audience, query, suggestions]
  );

  const filtered = useMemo(() => {
    return records.filter((activity) => matchesActivityFilter(activity, query, audience));
  }, [audience, query, records]);

  async function addSuggestionToQueue(suggestion: ActivitySuggestion, notify = true) {
    const activity = await createRecord("activity_ideas", {
      title: suggestion.title,
      category: suggestion.category,
      audience: suggestion.audience,
      description: suggestion.description,
      location: suggestion.location,
      estimated_cost: suggestion.estimated_cost,
      duration_minutes: suggestion.duration_minutes,
      season: suggestion.season,
      indoor: suggestion.indoor,
      supplies: suggestion.supplies,
      status: "idea",
      scheduled_event_id: null,
      assigned_to: suggestion.assigned_to,
      notes: suggestion.notes,
      created_by: currentMemberId
    });

    if (notify) {
      toast({ title: "Added to queue", description: `${activity.title} is now in the activities queue.`, variant: "success" });
    }
    return activity;
  }

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

  async function scheduleSuggestion(suggestion: ActivitySuggestion) {
    const activity = await addSuggestionToQueue(suggestion, false);
    await scheduleActivity(activity);
  }

  return (
    <div className="app-page">
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

      <div className="grid-auto-fit-sm">
        {activityAudiences.map((item) => {
          const count = records.filter((record) => record.audience === item).length + suggestions.filter((suggestion) => suggestion.audience === item).length;

          return (
            <Card key={item} className={audience === item ? "border-primary" : undefined}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center justify-between gap-3 text-sm">
                  {titleCase(item)}
                  <Badge variant="outline">{count}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="min-h-12 text-xs leading-5 text-muted-foreground">{audienceDescriptions[item]}</p>
                <Button className="mt-3 w-full" size="sm" variant={audience === item ? "default" : "outline"} onClick={() => setAudience(item)}>
                  View
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="surface-panel p-4">
        <div className="grid-auto-fit-sm">
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

      <Card className="border-[#ACE1AF]/80">
        <CardHeader className="flex flex-col gap-3 space-y-0 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Suggested for Your Family
            </CardTitle>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Suggestions adapt to child profiles, ages, and the current audience filter. Add age labels in Settings for better matches.
            </p>
          </div>
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "flex min-h-14 w-full items-center gap-3 rounded-md border border-dashed px-4 py-3 text-sm transition-colors lg:w-80",
              draggingSuggestion
                ? "border-primary bg-[#ACE1AF]/30 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground"
            )}
            onDragOver={(event) => event.preventDefault()}
            onDrop={async (event) => {
              event.preventDefault();
              if (!draggingSuggestion) return;
              await addSuggestionToQueue(draggingSuggestion);
              setDraggingSuggestion(null);
            }}
            onKeyDown={(event) => {
              if ((event.key === "Enter" || event.key === " ") && draggingSuggestion) {
                event.preventDefault();
                void addSuggestionToQueue(draggingSuggestion).then(() => setDraggingSuggestion(null));
              }
            }}
          >
            <ArrowDownToLine className="h-5 w-5 shrink-0" />
            <span>{draggingSuggestion ? "Release to add this idea to the queue." : "Drag an idea here or use Add to Queue."}</span>
          </div>
        </CardHeader>
        <CardContent>
          {visibleSuggestions.length ? (
            <div className="grid-auto-fit">
              {visibleSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  draggable
                  className="record-tile flex h-full cursor-grab flex-col gap-4 active:cursor-grabbing"
                  onDragStart={() => setDraggingSuggestion(suggestion)}
                  onDragEnd={() => setDraggingSuggestion(null)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{titleCase(suggestion.audience)}</Badge>
                        <Badge variant={suggestion.indoor ? "secondary" : "info"}>{suggestion.indoor ? "Indoor" : "Outdoor"}</Badge>
                      </div>
                      <h3 className="mt-3 text-base font-semibold leading-tight">{suggestion.title}</h3>
                    </div>
                    <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{suggestion.description}</p>
                  <p className="rounded-md bg-[#ACE1AF]/25 p-3 text-xs leading-5 text-[#235226] dark:bg-[#ACE1AF]/15 dark:text-[#D7F2D9]">
                    {suggestion.reason}
                  </p>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {suggestion.duration_minutes ? `${suggestion.duration_minutes} minutes` : "Flexible timing"}
                    </span>
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {suggestion.estimated_cost
                        ? Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(suggestion.estimated_cost)
                        : "Free or flexible"}
                    </span>
                  </div>
                  <div className="app-toolbar mt-auto">
                    <Button variant="outline" onClick={() => addSuggestionToQueue(suggestion)}>
                      <Plus className="h-4 w-4" />
                      Add to Queue
                    </Button>
                    <Button onClick={() => scheduleSuggestion(suggestion)}>
                      <CalendarPlus className="h-4 w-4" />
                      Add to Calendar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No suggestions match the current filters.</p>
          )}
        </CardContent>
      </Card>

      {filtered.length ? (
        <div className="grid-auto-fit">
          {filtered.map((activity) => (
            <Card key={activity.id} className="flex h-full flex-col">
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
              <CardContent className="flex flex-1 flex-col space-y-4">
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
                <div className="app-toolbar mt-auto">
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
