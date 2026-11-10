import { createHash } from "node:crypto";
import { addDays, format, parseISO } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { z } from "zod";

export const scopes = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export type EventFields = {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  allDay: boolean;
};
export const googleEventSchema = z.object({
  id: z.string().min(1).max(1024),
  etag: z.string().optional(),
  status: z.string().optional(),
  summary: z.string().max(1000).optional(),
  description: z.string().max(20000).optional(),
  location: z.string().max(2000).optional(),
  start: z
    .object({ date: z.string().optional(), dateTime: z.string().optional() })
    .optional(),
  end: z
    .object({ date: z.string().optional(), dateTime: z.string().optional() })
    .optional(),
  attendees: z.array(z.object({ self: z.boolean().optional() })).optional(),
  locked: z.boolean().optional(),
  organizer: z.object({ self: z.boolean().optional() }).optional(),
  recurringEventId: z.string().optional(),
  eventType: z.string().optional(),
  extendedProperties: z
    .object({
      private: z
        .object({
          gatherLink: z.string().max(100).optional(),
          gatherLocal: z.string().max(200).optional(),
          gatherSource: z.string().max(1024).optional(),
        })
        .optional(),
    })
    .optional(),
});
export type GoogleEvent = z.infer<typeof googleEventSchema>;
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export function remoteFields(event: GoogleEvent): EventFields | null {
  if (event.status === "cancelled") return null;
  const allDay = !!event.start?.date;
  const start = allDay
    ? dateOnly.parse(event.start?.date)
    : new Date(event.start?.dateTime ?? "").toISOString();
  const end = allDay
    ? dateOnly.parse(event.end?.date)
    : new Date(event.end?.dateTime ?? "").toISOString();
  if (end <= start) throw new Error("Invalid event duration");
  return {
    title: event.summary || "Untitled event",
    description: event.description ?? "",
    location: event.location ?? "",
    start,
    end,
    allDay,
  };
}
export function localFields(
  event: {
    title: string;
    description?: string | null;
    location?: string | null;
    start_at: string;
    end_at?: string | null;
    all_day: boolean;
  },
  zone: string,
): EventFields {
  const start = event.all_day
    ? formatInTimeZone(event.start_at, zone, "yyyy-MM-dd")
    : new Date(event.start_at).toISOString();
  const end = event.all_day
    ? event.end_at
      ? formatInTimeZone(event.end_at, zone, "yyyy-MM-dd")
      : format(addDays(parseISO(start), 1), "yyyy-MM-dd")
    : new Date(
        event.end_at ?? new Date(new Date(start).getTime() + 3600000),
      ).toISOString();
  return {
    title: event.title,
    description: event.description ?? "",
    location: event.location ?? "",
    start,
    end:
      end > start
        ? end
        : event.all_day
          ? format(addDays(parseISO(start), 1), "yyyy-MM-dd")
          : new Date(new Date(start).getTime() + 3600000).toISOString(),
    allDay: event.all_day,
  };
}
export function localPayload(fields: EventFields, zone: string) {
  return {
    title: fields.title,
    description: fields.description || null,
    location: fields.location || null,
    start_at: fields.allDay
      ? fromZonedTime(`${fields.start}T00:00:00`, zone).toISOString()
      : fields.start,
    end_at: fields.allDay
      ? fromZonedTime(`${fields.end}T00:00:00`, zone).toISOString()
      : fields.end,
    all_day: fields.allDay,
  };
}
export function googlePayload(fields: EventFields) {
  return {
    summary: fields.title,
    description: fields.description,
    location: fields.location,
    start: fields.allDay ? { date: fields.start } : { dateTime: fields.start },
    end: fields.allDay ? { date: fields.end } : { dateTime: fields.end },
  };
}
export const same = (a: EventFields | null, b: EventFields | null) =>
  JSON.stringify(a) === JSON.stringify(b);
export function decision(
  base: EventFields | null,
  local: EventFields | null,
  remote: EventFields | null,
) {
  if (same(local, remote)) return "equal";
  if (same(local, base)) return "pull";
  if (same(remote, base)) return "push";
  return "conflict";
}
export const googleIdForLocal = (link: string, id: string) =>
  `a${digest(`${link}:${id}`)}`;
export const localIdForGoogle = (link: string, id: string) =>
  `google_${digest(`${link}:${id}`)}`;
export function claimedLocalId(link: string, event: GoogleEvent) {
  const marker = event.extendedProperties?.private;
  if (marker?.gatherLink !== link || !marker.gatherLocal) return null;
  const source = marker.gatherSource
    ? `${marker.gatherLocal}:${marker.gatherSource}`
    : marker.gatherLocal;
  return event.id === googleIdForLocal(link, source)
    ? marker.gatherLocal
    : null;
}
