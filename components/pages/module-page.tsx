"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Filter,
  ListChecks,
  Plus,
  Printer,
  RotateCcw,
  ShoppingCart,
  Utensils
} from "lucide-react";
import { addDays, eachDayOfInterval, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateBadge } from "@/components/app/date-badge";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { PersonAvatar } from "@/components/app/person-avatar";
import { PriorityBadge } from "@/components/app/priority-badge";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { useAppData } from "@/components/app/providers";
import { DataTable } from "@/components/pages/data-table";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { useToast } from "@/hooks/use-toast";
import { applyRecordFilters, defaultFilters, getRecordTitle, recordDate, type FilterState } from "@/lib/filtering";
import type { ModuleConfig } from "@/lib/modules";
import type { AnyRecord, GroceryItem, MealPlan, TaskRecord, ViewMode } from "@/lib/types";
import { formatDate, isOverdue, recordMap, safeNumber, titleCase } from "@/lib/utils";

interface ModulePageProps {
  config: ModuleConfig;
}

function updateFilter<K extends keyof FilterState>(filters: FilterState, key: K, value: FilterState[K]) {
  return { ...filters, [key]: value };
}

function FilterBar({
  config,
  filters,
  onChange
}: {
  config: ModuleConfig;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}) {
  const { members } = useFamilyMembers();
  const hasStatus = config.fields.some((field) => field.name === "status");
  const hasPriority = config.fields.some((field) => field.name === "priority" || field.name === "importance");
  const hasPerson = config.fields.some((field) => field.type === "person");

  return (
    <div className="surface-panel p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        Filters
      </div>
      <div className="grid-auto-fit-sm mt-4">
        <Input
          aria-label={`Search ${config.title}`}
          placeholder="Search this page"
          value={filters.query}
          onChange={(event) => onChange(updateFilter(filters, "query", event.target.value))}
        />
        {hasPerson ? (
          <Select value={filters.person} onValueChange={(value) => onChange(updateFilter(filters, "person", value))}>
            <SelectTrigger>
              <SelectValue placeholder="Person" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All people</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {hasStatus ? (
          <Select value={filters.status} onValueChange={(value) => onChange(updateFilter(filters, "status", value))}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Array.from(new Set(["not_started", "in_progress", "waiting", "done", "upcoming", "paid", "overdue", "complete", "paused"])).map(
                (status) => (
                  <SelectItem key={status} value={status}>
                    {titleCase(status)}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        ) : null}
        {hasPriority ? (
          <Select value={filters.priority} onValueChange={(value) => onChange(updateFilter(filters, "priority", value))}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {["low", "medium", "high", "urgent"].map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {titleCase(priority)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {config.categoryOptions ? (
          <Select value={filters.category} onValueChange={(value) => onChange(updateFilter(filters, "category", value))}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {config.categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select value={filters.date} onValueChange={(value) => onChange(updateFilter(filters, "date", value as FilterState["date"]))}>
          <SelectTrigger>
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SummaryStrip({ config, records }: { config: ModuleConfig; records: AnyRecord[] }) {
  if (config.key === "bills") {
    const total = records.reduce((sum, record) => sum + safeNumber(recordMap(record).amount), 0);
    const overdue = records.filter((record) => recordMap(record).status === "overdue" || isOverdue(recordMap(record).due_date as string | undefined)).length;
    return (
      <div className="grid-auto-fit-sm">
        <StatCard label="Monthly Estimate" value={Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)} tone="sage" />
        <StatCard label="Upcoming Bills" value={records.filter((record) => recordMap(record).status === "upcoming").length} tone="yellow" />
        <StatCard label="Overdue Bills" value={overdue} tone={overdue > 0 ? "red" : "green"} />
      </div>
    );
  }

  if (config.key === "finances") {
    const grouped = ["Cash", "Credit", "Insurance", "Loan", "Subscription", "Investment"].map((type) => ({
      type,
      count: records.filter((record) => recordMap(record).account_type === type).length
    }));
    return (
      <div className="grid-auto-fit-sm">
        {grouped.map((item) => (
          <StatCard key={item.type} label={item.type} value={item.count} tone={item.count > 0 ? "sage" : "default"} />
        ))}
      </div>
    );
  }

  if (config.key === "grocery") {
    const open = records.filter((record) => !(record as GroceryItem).checked).length;
    return (
      <div className="grid-auto-fit-sm">
        <StatCard label="Open Items" value={open} icon={<ShoppingCart className="h-5 w-5" />} tone={open ? "yellow" : "green"} />
        <StatCard label="Checked" value={records.length - open} tone="green" />
        <StatCard label="Stores" value={new Set(records.map((record) => (record as GroceryItem).store).filter(Boolean)).size} tone="sage" />
      </div>
    );
  }

  if (config.key === "tasks") {
    const overdue = records.filter((record) => (record as TaskRecord).status !== "done" && isOverdue((record as TaskRecord).due_at)).length;
    return (
      <div className="grid-auto-fit-sm">
        <StatCard label="Open Tasks" value={records.filter((record) => (record as TaskRecord).status !== "done").length} icon={<ListChecks className="h-5 w-5" />} tone="sage" />
        <StatCard label="Overdue" value={overdue} tone={overdue ? "red" : "green"} />
        <StatCard label="Done" value={records.filter((record) => (record as TaskRecord).status === "done").length} tone="green" />
      </div>
    );
  }

  return null;
}

function TaskKanban({ config, records }: { config: ModuleConfig; records: AnyRecord[] }) {
  const { updateRecord } = useAppData();
  const { toast } = useToast();
  const [editing, setEditing] = useState<AnyRecord | null>(null);
  const statuses = ["not_started", "in_progress", "waiting", "done"];

  return (
    <>
      <div className="grid-auto-fit">
        {statuses.map((status) => (
          <div key={status} className="surface-panel min-h-64 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{titleCase(status)}</h2>
              <StatusBadge status={status} />
            </div>
            <div className="space-y-3">
              {records
                .filter((record) => (record as TaskRecord).status === status)
                .map((record) => {
                  const task = record as TaskRecord;
                  return (
                    <div key={record.id} className="record-tile">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button className="text-left text-sm font-semibold hover:underline" onClick={() => setEditing(record)}>
                            {task.title}
                          </button>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                        </div>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <PersonAvatar personId={task.assigned_to} size="sm" />
                        <DateBadge value={task.due_at} />
                      </div>
                      {task.status !== "done" ? (
                        <Button
                          className="mt-3 w-full"
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await updateRecord("tasks", task.id, { status: "done", completed_at: new Date().toISOString() });
                            toast({ title: "Task completed", description: task.title, variant: "success" });
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Complete
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
      <RecordFormDialog config={config} record={editing} open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} />
    </>
  );
}

function GroceryShopping({ records }: { records: GroceryItem[] }) {
  const { updateRecord } = useAppData();
  const grouped = records.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    const key = item.store || item.category || "Other";
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});

  return (
    <div className="grid-auto-fit-lg">
      {Object.entries(grouped).map(([group, items]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {group}
              <span className="text-sm font-normal text-muted-foreground">{items.filter((item) => !item.checked).length} open</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => (
              <label
                key={item.id}
                className="record-tile flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2 text-base hover:bg-white dark:hover:bg-white/10"
              >
                <Checkbox checked={item.checked} onCheckedChange={(checked) => updateRecord("grocery_items", item.id, { checked: Boolean(checked) })} />
                <span className={item.checked ? "min-w-0 flex-1 text-muted-foreground line-through" : "min-w-0 flex-1"}>
                  {item.name}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {[item.quantity, item.unit].filter(Boolean).join(" ")}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{item.category}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MealWeekly({ records }: { records: MealPlan[] }) {
  const { addIngredientsToGrocery } = useAppData();
  const { toast } = useToast();
  const days = eachDayOfInterval({ start: startOfWeek(new Date()), end: addDays(startOfWeek(new Date()), 6) });

  return (
    <div className="grid-auto-fit-xs">
      {days.map((day) => {
        const meals = records.filter((meal) => isSameDay(parseISO(meal.meal_date), day));
        return (
          <Card key={day.toISOString()}>
            <CardHeader className="p-4">
              <CardTitle className="text-sm">{format(day, "EEE d")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {meals.length ? (
                meals.map((meal) => (
                  <div key={meal.id} className="record-tile">
                    <p className="text-xs font-medium text-muted-foreground">{meal.meal_type}</p>
                    <p className="mt-1 text-sm font-semibold">{meal.title}</p>
                    {meal.notes ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meal.notes}</p> : null}
                    {meal.ingredients ? (
                      <Button
                        className="mt-3 w-full"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await addIngredientsToGrocery(meal.ingredients ?? "");
                          toast({ title: "Ingredients added", description: "The grocery list was updated.", variant: "success" });
                        }}
                      >
                        <Utensils className="h-4 w-4" />
                        Add ingredients
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No meal planned</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CalendarMode({ mode, records }: { mode: ViewMode; records: AnyRecord[] }) {
  if (mode === "month") {
    const start = startOfWeek(startOfMonth(new Date()));
    const days = eachDayOfInterval({ start, end: addDays(start, 41) });
    return (
      <div className="surface-panel min-w-0 overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7 overflow-hidden rounded-[var(--app-card-radius)]">
          {days.map((day) => {
            const events = records.filter((record) => {
              const date = recordDate(record);
              return date ? isSameDay(date, day) : false;
            });
            return (
              <div key={day.toISOString()} className="min-h-32 border-b border-r p-3">
                <div className={isSameMonth(day, new Date()) ? "text-xs font-semibold" : "text-xs text-muted-foreground"}>{format(day, "d")}</div>
                <div className="mt-2 space-y-1.5">
                  {events.slice(0, 3).map((record) => (
                    <div key={record.id} className="truncate rounded bg-[#ACE1AF]/35 px-2 py-1 text-xs text-[#235226] dark:bg-[#ACE1AF]/15 dark:text-[#D7F2D9]">
                      {getRecordTitle(record)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === "week") {
    const days = eachDayOfInterval({ start: startOfWeek(new Date()), end: addDays(startOfWeek(new Date()), 6) });
    return (
      <div className="grid-auto-fit-xs">
        {days.map((day) => {
          const dayRecords = records.filter((record) => {
            const date = recordDate(record);
            return date ? isSameDay(date, day) : false;
          });
          return (
            <Card key={day.toISOString()}>
              <CardHeader className="p-4">
                <CardTitle className="text-sm">{format(day, "EEE d")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {dayRecords.length ? (
                  dayRecords.map((record) => (
                    <div key={record.id} className="record-tile p-2 text-sm">
                      {getRecordTitle(record)}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Open</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="app-section">
      {records.map((record) => (
        <Card key={record.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{getRecordTitle(record)}</p>
              <p className="text-sm text-muted-foreground">{formatDate(recordDate(record)?.toISOString())}</p>
            </div>
            <StatusBadge status={String(recordMap(record).status ?? recordMap(record).category ?? "scheduled")} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ModulePage({ config }: ModulePageProps) {
  const records = useRealtimeTable(config.table).filter((record) => "family_id" in record) as AnyRecord[];
  const { createRecord, clearCheckedGroceries } = useAppData();
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [view, setView] = useState<ViewMode>(config.defaultView);
  const [formOpen, setFormOpen] = useState(false);
  const filteredRecords = useMemo(() => applyRecordFilters(records, filters), [filters, records]);
  const sortedRecords = useMemo(
    () =>
      [...filteredRecords].sort((a, b) => {
        const aDate = recordDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDate = recordDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      }),
    [filteredRecords]
  );

  async function addRecentGrocery() {
    const recent = records.find((record) => (record as GroceryItem).checked) as GroceryItem | undefined;
    if (!recent) {
      toast({ title: "No recent checked item", description: "Check an item first, then it can be repeated quickly." });
      return;
    }

    await createRecord("grocery_items", { ...recent, id: undefined, checked: false, name: recent.name });
    toast({ title: "Recent item added", description: recent.name, variant: "success" });
  }

  const secondaryAction =
    config.key === "grocery" ? (
      <>
        <Button variant="outline" onClick={addRecentGrocery}>
          <RotateCcw className="h-4 w-4" />
          Add Recent
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            await clearCheckedGroceries();
            toast({ title: "Checked items cleared", variant: "success" });
          }}
        >
          Clear Checked
        </Button>
      </>
    ) : config.key === "emergency" ? (
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Print
      </Button>
    ) : null;

  return (
    <div className="app-page">
      <PageHeader
        title={config.title}
        description={config.description}
        secondaryAction={secondaryAction}
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            {config.addLabel}
          </Button>
        }
      />
      {config.sensitive ? (
        <div className="surface-panel border-[#ACE1AF] bg-[#ACE1AF]/30 p-4 text-sm text-[#235226] dark:border-[#ACE1AF]/45 dark:bg-[#ACE1AF]/15 dark:text-[#D7F2D9]">
          Privacy mode hides sensitive details on this page. Store only partial identifiers and safe notes.
        </div>
      ) : null}
      <SummaryStrip config={config} records={records} />
      <FilterBar config={config} filters={filters} onChange={setFilters} />
      {records.length === 0 ? (
        <EmptyState
          title={config.emptyTitle}
          description={config.emptyDescription}
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              {config.addLabel}
            </Button>
          }
        />
      ) : (
        <Tabs value={view} onValueChange={(value) => setView(value as ViewMode)}>
          <TabsList className="max-w-full">
            {config.viewModes.map((mode) => (
              <TabsTrigger key={mode} value={mode}>
                {mode === "month" || mode === "week" || mode === "agenda" ? <CalendarDays className="mr-2 h-4 w-4" /> : null}
                {titleCase(mode)}
              </TabsTrigger>
            ))}
          </TabsList>
          {config.viewModes.map((mode) => (
            <TabsContent key={mode} value={mode}>
              {sortedRecords.length === 0 ? (
                <EmptyState title="No matching records" description="Adjust the filters or add a new record." />
              ) : mode === "kanban" ? (
                <TaskKanban config={config} records={sortedRecords} />
              ) : mode === "shopping" ? (
                <GroceryShopping records={sortedRecords as GroceryItem[]} />
              ) : mode === "weekly" ? (
                <MealWeekly records={sortedRecords as MealPlan[]} />
              ) : mode === "month" || mode === "week" || mode === "agenda" ? (
                <CalendarMode mode={mode} records={sortedRecords} />
              ) : (
                <DataTable config={config} records={sortedRecords} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
      <RecordFormDialog config={config} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
