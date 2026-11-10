import { adminClient, configuration } from "../../lib/google-calendar/server";
import { syncGoogleCalendar } from "../../lib/google-calendar/sync";

export default async () => {
  if (configuration().length) return new Response(null, { status: 204 });
  const db = adminClient();
  const result = await db
    .from("google_calendar_links")
    .select("id")
    .in("status", ["ready", "error"])
    .order("last_attempt_at", { ascending: true, nullsFirst: true })
    .limit(1);
  if (result.error) return new Response(null, { status: 503 });
  if (result.data?.[0]) await syncGoogleCalendar(result.data[0].id);
  return new Response(null, { status: 204 });
};

export const config = { schedule: "*/5 * * * *" };
