"use client";

import { useRef, useState } from "react";
import { CalendarClock, Download, HelpCircle, Plus, Upload } from "lucide-react";
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

const syncGuides = [
  {
    title: "Google Calendar",
    steps: [
      "Click Export ICS in this panel.",
      "Open Google Calendar settings, then Import & export.",
      "Choose the downloaded family-control-center.ics file.",
      "Pick the target Google calendar and import.",
      "Return here and mark the Google connection Active after confirming the events."
    ]
  },
  {
    title: "Apple Calendar",
    steps: [
      "Click Export ICS in this panel.",
      "Open Apple Calendar on Mac, then choose File > Import.",
      "Select the downloaded ICS file.",
      "Choose the calendar where family events should appear.",
      "For iPhone-only use, save the ICS to iCloud Drive and open it from the Files app."
    ]
  },
  {
    title: "Outlook",
    steps: [
      "Click Export ICS in this panel.",
      "Open Outlook Calendar and choose Add calendar.",
      "Use Upload from file when available.",
      "Select the ICS file and choose the destination calendar.",
      "Confirm that bills, appointments, and dated tasks imported as expected."
    ]
  },
  {
    title: "WebCal / ICS subscription",
    steps: [
      "Use this once a hosted feed URL exists for the app.",
      "Copy the feed URL from the Calendar Sync record.",
      "In your calendar app, choose Subscribe from URL or Add calendar from web.",
      "Paste the URL, name the calendar, and set refresh preferences.",
      "Keep account passwords in a password manager, not in this app."
    ]
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
  const { data, createRecord, updateRecord, currentMember } = useAppData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [connectionDefaults, setConnectionDefaults] = useState<Record<string, unknown> | undefined>();
  const connectionConfig = moduleConfigs.calendarConnections;
  const connections = data.calendar_connections;

  if (currentMember?.role === "viewer") return null;

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
    <section className="app-section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-normal">Calendar Sync</h2>
          <p className="text-wrap-safe mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Export or import ICS files for Google Calendar, Apple Calendar, Outlook, and other calendar apps. Saved provider records document
            webcal/OAuth setup and sync status.
          </p>
        </div>
        <div className="app-toolbar shrink-0 sm:justify-end">
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

      <div className="grid-auto-fit-sm">
        {providerCards.map((card) => (
          <Card key={card.provider} className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="flex min-w-0 items-center gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4 text-primary" />
            Sync Setup FAQ
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {syncGuides.map((guide) => (
            <div key={guide.title} className="record-tile">
              <h3 className="font-semibold">{guide.title}</h3>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {guide.steps.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#ACE1AF]/40 text-xs font-semibold text-[#235226]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </CardContent>
      </Card>

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
