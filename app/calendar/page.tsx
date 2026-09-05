"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startOfDay } from "date-fns";
import { CalendarPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { MemberChip } from "@/components/app/member-avatar";
import { PageHeader } from "@/components/app/page-header";
import { useAppData } from "@/components/app/providers";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { memberCanAccessPath } from "@/lib/access-control";
import type { AgendaItem } from "@/lib/daily-brief";
import { moduleConfigs } from "@/lib/modules";
import type { EventRecord } from "@/lib/types";
import { parseMaybeDate } from "@/lib/utils";
import { AgendaView } from "@/components/calendar/agenda-view";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { DaySheet } from "@/components/calendar/day-sheet";
import { DayView } from "@/components/calendar/day-view";
import { LayerToggles } from "@/components/calendar/layer-toggles";
import { MonthView } from "@/components/calendar/month-view";
import { SyncSection } from "@/components/calendar/sync-section";
import { WeekView } from "@/components/calendar/week-view";
import { agendaForDay, useCalendarAgenda, useVisibleDays } from "@/components/calendar/use-calendar-agenda";
import {
  LAYERS_STORAGE_KEY,
  VIEW_STORAGE_KEY,
  type CalendarView,
  type LayerState,
  dayKey,
  defaultLayers,
  defaultStartFor,
  rangeLabel,
  readStoredLayers,
  readStoredView,
  shiftAnchor,
  writeStored
} from "@/components/calendar/helpers";

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function CalendarPage() {
  const router = useRouter();
  const { data, currentMember } = useAppData();
  const { members } = useFamilyMembers();
  const isParent = !currentMember || currentMember.role !== "viewer";
  const includeSensitive = memberCanAccessPath(currentMember, "/finances");

  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState<Date>(today);
  const [layers, setLayers] = useState<LayerState>(defaultLayers);
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [sheetDay, setSheetDay] = useState<Date | null>(null);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [createDefaults, setCreateDefaults] = useState<Record<string, unknown> | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const syncRef = useRef<HTMLDivElement | null>(null);

  // Restore the last view and layer choices once we are on the client.
  useEffect(() => {
    const storedView = readStoredView();
    if (storedView) setView(storedView);
    const storedLayers = readStoredLayers();
    if (storedLayers) setLayers(storedLayers);
  }, []);

  const { days, start, end } = useVisibleDays(view, anchor);
  const { byDay, conflicts } = useCalendarAgenda({ data, days, layers, memberId: memberFilter, includeSensitive });
  const label = rangeLabel(view, anchor, start, end);
  const showingToday = today >= start && today <= end;
  const dialogOpen = Boolean(sheetDay || editing || createDefaults);

  const changeView = useCallback((next: CalendarView) => {
    setView(next);
    writeStored(VIEW_STORAGE_KEY, next);
  }, []);

  const changeLayers = useCallback((next: LayerState) => {
    setLayers(next);
    writeStored(LAYERS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const goPrev = useCallback(() => setAnchor((current) => shiftAnchor(view, current, -1)), [view]);
  const goNext = useCallback(() => setAnchor((current) => shiftAnchor(view, current, 1)), [view]);
  const goToday = useCallback(() => setAnchor(today), [today]);

  const openCreate = useCallback((day: Date, hour = 9) => {
    setCreateDefaults({ start_at: defaultStartFor(day, hour) });
  }, []);

  const openSync = useCallback(() => {
    setSyncOpen(true);
    window.requestAnimationFrame(() => syncRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  // Deep links from Today / notifications: /calendar?record=<eventId>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("record");
    if (!id) return;
    const event = data.events.find((item) => item.id === id);
    if (!event) return;
    const when = parseMaybeDate(event.start_at);
    if (when) {
      const day = startOfDay(when);
      setAnchor(day);
      setSheetDay(day);
    }
    if (isParent) setEditing(event);
    window.history.replaceState(null, "", "/calendar");
  }, [data.events, isParent]);

  // Arrow keys move through time when focus is not inside a field or dialog.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (dialogOpen || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (EDITABLE_TAGS.has(target.tagName) || target.isContentEditable || target.closest("[role='dialog']"))) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "t" || event.key === "T") {
        goToday();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen, goNext, goPrev, goToday]);

  const eventById = useCallback((id: string) => data.events.find((event) => event.id === id) ?? null, [data.events]);

  /** Events open the editor for parents; everything else goes to its home page. */
  const handleSelectItem = useCallback(
    (item: AgendaItem, day: Date) => {
      if (item.kind === "event") {
        const event = eventById(item.id);
        if (event && isParent) {
          setEditing(event);
          return;
        }
        setSheetDay(day);
        return;
      }
      router.push(item.route);
    },
    [eventById, isParent, router]
  );

  const handleSheetItem = useCallback(
    (item: AgendaItem) => {
      if (item.kind === "event") {
        const event = eventById(item.id);
        if (event && isParent) {
          setSheetDay(null);
          setEditing(event);
        }
        return;
      }
      setSheetDay(null);
      router.push(item.route);
    },
    [eventById, isParent, router]
  );

  const sheetItems = useMemo(() => {
    if (!sheetDay) return [];
    return byDay.get(dayKey(sheetDay)) ?? agendaForDay(data, sheetDay, layers, memberFilter, includeSensitive);
  }, [byDay, data, includeSensitive, layers, memberFilter, sheetDay]);

  const hasEvents = data.events.length > 0;
  const dayItems = byDay.get(dayKey(anchor)) ?? [];

  return (
    <div className="app-page">
      <PageHeader
        title="Family Calendar"
        description="Events, tasks, meals, chores, bills, and celebrations for the whole family in one place. Tap any day to see everything on it."
      />

      {!hasEvents ? (
        <EmptyState
          title="Your calendar is a blank page"
          description={
            isParent
              ? "Add the first event, or import an ICS file from Google, Apple, or Outlook to bring your existing schedule over. Tasks, meals, and chores already show up here automatically."
              : "No events yet. Ask a parent to add the first one. Your tasks, chores, and meals still show up here."
          }
          action={
            isParent ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => openCreate(today)}>
                  <CalendarPlus className="h-4 w-4" />
                  Add event
                </Button>
                <Button variant="outline" onClick={openSync}>
                  <Upload className="h-4 w-4" />
                  Import calendar
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : null}

      <section className="surface-panel fade-up flex flex-col gap-4 p-3 sm:p-4">
        <CalendarHeader
          view={view}
          onViewChange={changeView}
          label={label}
          showingToday={showingToday}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
          onAdd={isParent ? () => openCreate(anchor) : undefined}
        />

        <div className="flex flex-col gap-2">
          <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 py-0.5" role="group" aria-label="Filter by person">
            <MemberChip member={null} active={memberFilter === null} onClick={() => setMemberFilter(null)} size="sm" />
            {members.map((member) => (
              <MemberChip
                key={member.id}
                member={member}
                active={memberFilter === member.id}
                onClick={() => setMemberFilter((current) => (current === member.id ? null : member.id))}
                size="sm"
              />
            ))}
          </div>
          <LayerToggles layers={layers} onChange={changeLayers} includeSensitive={includeSensitive} />
        </div>

        <div key={view} className="fade-up">
          {view === "month" ? (
            <MonthView days={days} anchor={anchor} today={today} byDay={byDay} members={members} onSelectDay={setSheetDay} onSelectItem={handleSelectItem} />
          ) : null}
          {view === "week" ? (
            <WeekView days={days} today={today} byDay={byDay} conflicts={conflicts} members={members} onSelectDay={setSheetDay} onSelectItem={handleSelectItem} />
          ) : null}
          {view === "day" ? (
            <DayView
              day={anchor}
              today={today}
              items={dayItems}
              conflicts={conflicts}
              members={members}
              onSelectItem={handleSelectItem}
              onAddAt={isParent ? (hour) => openCreate(anchor, hour) : undefined}
            />
          ) : null}
          {view === "agenda" ? (
            <AgendaView
              days={days}
              today={today}
              byDay={byDay}
              conflicts={conflicts}
              members={members}
              onSelectDay={setSheetDay}
              onSelectItem={handleSelectItem}
              onAdd={isParent ? (day) => openCreate(day) : undefined}
            />
          ) : null}
        </div>

        <p className="hidden text-xs text-muted-foreground lg:block">
          Tip: use <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px]">←</kbd>{" "}
          <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px]">→</kbd> to move through time and{" "}
          <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px]">T</kbd> to jump back to today.
        </p>
      </section>

      <SyncSection ref={syncRef} open={syncOpen} onOpenChange={setSyncOpen} />

      <DaySheet
        day={sheetDay}
        open={Boolean(sheetDay)}
        onOpenChange={(open) => {
          if (!open) setSheetDay(null);
        }}
        items={sheetItems}
        conflicts={conflicts}
        members={members}
        today={today}
        canOpenItem={(item) => item.kind !== "event" || isParent}
        onSelectItem={handleSheetItem}
        onAdd={
          isParent
            ? () => {
                const day = sheetDay;
                setSheetDay(null);
                if (day) openCreate(day);
              }
            : undefined
        }
      />

      <RecordFormDialog
        config={moduleConfigs.calendar}
        open={Boolean(createDefaults)}
        onOpenChange={(open) => {
          if (!open) setCreateDefaults(null);
        }}
        defaultOverrides={createDefaults ?? undefined}
      />

      <RecordFormDialog
        config={moduleConfigs.calendar}
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        record={editing}
      />
    </div>
  );
}
