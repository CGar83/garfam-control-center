"use client";

import { useRef, useState } from "react";
import { CalendarClock, Download, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/components/app/providers";
import { DataTable } from "@/components/pages/data-table";
import { RecordFormDialog } from "@/components/pages/record-form-dialog";
import { useToast } from "@/hooks/use-toast";
import { familyCalendarItems, generateIcsCalendar, parseIcsEvents } from "@/lib/calendar-sync";
import { moduleConfigs } from "@/lib/modules";
import type { CalendarProvider } from "@/lib/types";
import { nowIso, titleCase } from "@/lib/utils";

const providerCards: Array<{
  provider: CalendarProvider;
  title: string;
  description: string;
}> = [
  {
    provider: "google",
    title: "Google Calendar",
    description: "Download an ICS file to import, or save a Google connection record for OAuth/webcal setup."
  },
  {
    provider: "apple",
    title: "Apple Calendar",
    description: "Use the ICS export for Apple Calendar import, or store a webcal feed when one is hosted."
  },
  {
    provider: "outlook",
    title: "Outlook",
    description: "Import the family ICS file into Outlook, Microsoft 365, or a shared Outlook calendar."
  },
  {
    provider: "ics",
    title: "ICS / WebCal",
    description: "Provider-neutral export and import for most calendar apps."
  }
];

function downloadFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CalendarSyncPanel() {
  const { data, createRecord, updateRecord } = useAppData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [connectionDefaults, setConnectionDefaults] = useState<Record<string, unknown> | undefined>();
  const connectionConfig = moduleConfigs.calendarConnections;
  const connections = data.calendar_connections;

  async function exportCalendar() {
    const items = familyCalendarItems({
      events: data.events,
      tasks: data.tasks,
      bills: data.bills,
      healthRecords: data.health_records
    });

    const ics = generateIcsCalendar(data.families[0]?.name ?? "Family Calendar", items);
    downloadFile("family-control-center.ics", ics);

    await Promise.all(
      connections
        .filter((connection) => connection.sync_direction === "export" || connection.sync_direction === "two_way")
        .map((connection) => updateRecord("calendar_connections", connection.id, { last_synced_at: nowIso(), sync_status: "active" }))
    );

    toast({ title: "Calendar exported", description: `${items.length} calendar items were written to the ICS file.`, variant: "success" });
  }

  async function importIcsFile(file: File) {
    const text = await file.text();
    const imported = parseIcsEvents(text);

    await Promise.all(
      imported.map((event) =>
        createRecord("events", {
          title: event.title,
          description: event.description,
          category: "Family",
          location: event.location,
          start_at: event.start_at,
          end_at: event.end_at,
          all_day: event.all_day,
          recurrence_rule: null,
          assigned_to: null
        })
      )
    );

    toast({ title: "Calendar imported", description: `${imported.length} events were added.`, variant: "success" });
  }

  function openConnection(provider: CalendarProvider) {
    setConnectionDefaults({
      provider,
      calendar_name: provider === "ics" ? "Family ICS Feed" : `${titleCase(provider)} Family Calendar`,
      sync_direction: provider === "ics" ? "import" : "export",
      sync_status: "setup_required",
      include_events: true,
      include_tasks: provider !== "apple",
      include_bills: provider !== "apple",
      include_appointments: true
    });
    setConnectionOpen(true);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-normal">Calendar Sync</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Export or import ICS files for Google Calendar, Apple Calendar, Outlook, and other calendar apps. Saved provider records document
            webcal/OAuth setup and sync status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Import ICS
          </Button>
          <Button onClick={exportCalendar}>
            <Download className="h-4 w-4" />
            Export ICS
          </Button>
        </div>
      </div>

      <Input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept=".ics,text/calendar"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          try {
            await importIcsFile(file);
          } catch (error) {
            toast({
              title: "Could not import calendar",
              description: error instanceof Error ? error.message : "Choose a valid ICS file.",
              variant: "destructive"
            });
          }
        }}
      />

      <div className="grid gap-3 lg:grid-cols-4">
        {providerCards.map((card) => (
          <Card key={card.provider}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  {card.title}
                </span>
                <Badge variant="outline">{connections.filter((connection) => connection.provider === card.provider).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">{card.description}</p>
              <Button variant="outline" className="w-full" onClick={() => openConnection(card.provider)}>
                <Plus className="h-4 w-4" />
                Add Connection
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {connections.length ? <DataTable config={connectionConfig} records={connections} /> : null}

      <RecordFormDialog
        config={connectionConfig}
        open={connectionOpen}
        onOpenChange={(open) => {
          setConnectionOpen(open);
          if (!open) setConnectionDefaults(undefined);
        }}
        defaultOverrides={connectionDefaults}
      />
    </section>
  );
}
