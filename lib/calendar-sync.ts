import { addHours, format, parse, parseISO } from "date-fns";
import type { Bill, EventRecord, HealthRecord, TaskRecord } from "@/lib/types";
import { parseMaybeDate } from "@/lib/utils";

export interface CalendarSyncItem {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean;
}

export interface ImportedCalendarEvent {
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  all_day: boolean;
}

function escapeIcsText(value?: string | null) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icsDateTime(value: string) {
  const parsed = parseMaybeDate(value) ?? new Date(value);
  return format(parsed, "yyyyMMdd'T'HHmmss'Z'");
}

function icsDate(value: string) {
  const parsed = parseMaybeDate(value) ?? new Date(value);
  return format(parsed, "yyyyMMdd");
}

function foldLine(line: string) {
  if (line.length <= 74) return line;
  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > 74) {
    chunks.push(remaining.slice(0, 74));
    remaining = ` ${remaining.slice(74)}`;
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

export function generateIcsCalendar(name: string, items: CalendarSyncItem[]) {
  const timestamp = icsDateTime(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gather//Family Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(name)}`
  ];

  for (const item of items) {
    const start = item.start_at;
    const end = item.end_at || addHours(parseISO(item.start_at), 1).toISOString();
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(item.id)}@family-control-center`);
    lines.push(`DTSTAMP:${timestamp}`);
    if (item.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(end)}`);
    } else {
      lines.push(`DTSTART:${icsDateTime(start)}`);
      lines.push(`DTEND:${icsDateTime(end)}`);
    }
    lines.push(`SUMMARY:${escapeIcsText(item.title)}`);
    if (item.description) lines.push(`DESCRIPTION:${escapeIcsText(item.description)}`);
    if (item.location) lines.push(`LOCATION:${escapeIcsText(item.location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function familyCalendarItems({
  events,
  tasks = [],
  bills = [],
  healthRecords = []
}: {
  events: EventRecord[];
  tasks?: TaskRecord[];
  bills?: Bill[];
  healthRecords?: HealthRecord[];
}) {
  const eventItems: CalendarSyncItem[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    start_at: event.start_at,
    end_at: event.end_at,
    all_day: event.all_day
  }));

  const taskItems: CalendarSyncItem[] = tasks
    .filter((task) => task.status !== "done" && task.due_at)
    .map((task) => ({
      id: task.id,
      title: `Task: ${task.title}`,
      description: task.description || task.notes,
      start_at: task.due_at as string,
      end_at: addHours(parseISO(task.due_at as string), 1).toISOString()
    }));

  const billItems: CalendarSyncItem[] = bills
    .filter((bill) => bill.due_date)
    .map((bill) => ({
      id: bill.id,
      title: `Bill: ${bill.name}`,
      description: bill.notes,
      start_at: `${bill.due_date}T09:00:00.000Z`,
      end_at: `${bill.due_date}T09:30:00.000Z`,
      all_day: true
    }));

  const appointmentItems: CalendarSyncItem[] = healthRecords
    .filter((record) => record.appointment_date)
    .map((record) => ({
      id: record.id,
      title: `Appointment: ${record.provider_name || record.record_type}`,
      description: record.notes,
      start_at: record.appointment_date as string,
      end_at: addHours(parseISO(record.appointment_date as string), 1).toISOString()
    }));

  return [...eventItems, ...taskItems, ...billItems, ...appointmentItems];
}

function unfoldIcsLines(ics: string) {
  return ics
    .replace(/\r\n/g, "\n")
    .split("\n")
    .reduce<string[]>((lines, line) => {
      if (/^[ \t]/.test(line) && lines.length) {
        lines[lines.length - 1] += line.slice(1);
      } else {
        lines.push(line);
      }
      return lines;
    }, []);
}

function parseIcsDateValue(value: string) {
  if (/^\d{8}$/.test(value)) {
    return parse(value, "yyyyMMdd", new Date()).toISOString();
  }
  if (/^\d{8}T\d{6}Z?$/.test(value)) {
    const normalized = value.endsWith("Z") ? value.slice(0, -1) : value;
    return parse(normalized, "yyyyMMdd'T'HHmmss", new Date()).toISOString();
  }
  return parseISO(value).toISOString();
}

function unescapeIcsText(value?: string) {
  return (value ?? "").replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

export function parseIcsEvents(ics: string): ImportedCalendarEvent[] {
  const lines = unfoldIcsLines(ics);
  const events: ImportedCalendarEvent[] = [];
  let current: Record<string, string> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.SUMMARY && current.DTSTART) {
        const allDay = current.DTSTART_TYPE === "DATE";
        events.push({
          title: unescapeIcsText(current.SUMMARY),
          description: unescapeIcsText(current.DESCRIPTION),
          location: unescapeIcsText(current.LOCATION),
          start_at: parseIcsDateValue(current.DTSTART),
          end_at: current.DTEND ? parseIcsDateValue(current.DTEND) : null,
          all_day: allDay
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const rawKey = line.slice(0, separator);
    const value = line.slice(separator + 1);
    const [key, ...params] = rawKey.split(";");
    current[key] = value;
    if (key === "DTSTART" && params.some((param) => param.toUpperCase() === "VALUE=DATE")) {
      current.DTSTART_TYPE = "DATE";
    }
  }

  return events;
}
