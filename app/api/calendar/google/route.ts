import { randomBytes } from "node:crypto";
import { CodeChallengeMethod } from "google-auth-library";
import { z } from "zod";
import {
  authorizeFinance,
  apiError,
  FinanceApiError,
  jsonResponse,
  readJson,
} from "@/lib/finance/server";
import {
  adminClient,
  configuration,
  dbResult,
  googleRequest,
  GoogleError,
  oauthClient,
  redirectUri,
  seal,
  tokenFor,
} from "@/lib/google-calendar/server";
import { digest, localFields, scopes } from "@/lib/google-calendar/core";
import { syncGoogleCalendar } from "@/lib/google-calendar/sync";
import type { EventRecord } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
const familySchema = z.string().min(1).max(160);
async function accessFor(request: Request, family: string) {
  const access = await authorizeFinance(request, family);
  const db = adminClient();
  const result = await db
    .from("google_calendar_links")
    .select("*")
    .eq("family_id", family)
    .maybeSingle();
  dbResult(result.error);
  return { ...access, db, link: result.data };
}
export async function GET(request: Request) {
  try {
    const url = new URL(request.url),
      family = familySchema.parse(url.searchParams.get("family_id"));
    const access = await authorizeFinance(request, family);
    const missing = configuration();
    if (missing.length)
      return jsonResponse({
        configured: false,
        missing,
        connection: null,
        calendars: [],
        conflicts: [],
      });
    const { db, link } = await accessFor(request, family);
    if (!link)
      return jsonResponse({
        configured: true,
        connection: null,
        calendars: [],
        conflicts: [],
      });
    const owner = link.user_id === access.userId;
    const calendars: unknown[] = [];
    if (url.searchParams.get("calendars") === "1" && owner) {
      let token: string;
      try {
        token = await tokenFor(link);
      } catch (error) {
        if (error instanceof GoogleError) {
          const saved = await db
            .from("google_calendar_links")
            .update({ status: "reconnect", error_code: "google_401" })
            .eq("id", link.id);
          dbResult(saved.error);
        }
        throw new FinanceApiError(
          "Google access expired. Refresh status and reconnect your account.",
          409,
        );
      }
      let page: string | undefined;
      for (let n = 0; n < 5; n++) {
        const params = new URLSearchParams({
          minAccessRole: "writer",
          maxResults: "100",
          fields: "items(id,summary,timeZone,accessRole),nextPageToken",
        });
        if (page) params.set("pageToken", page);
        let result;
        try {
          result = await googleRequest(
            token,
            `users/me/calendarList?${params}`,
          );
        } catch (error) {
          if (error instanceof GoogleError) {
            const saved = await db
              .from("google_calendar_links")
              .update({
                error_code: error.reason
                  ? `calendar_list_${error.reason}`
                  : `calendar_list_${error.status}`,
                ...(error.status === 401 ? { status: "reconnect" } : {}),
              })
              .eq("id", link.id);
            dbResult(saved.error);
          }
          throw error;
        }
        calendars.push(...(result.items ?? []));
        page = result.nextPageToken;
        if (!page) break;
      }
      if (link.error_code?.startsWith("calendar_list_")) {
        const saved = await db
          .from("google_calendar_links")
          .update({ error_code: null })
          .eq("id", link.id);
        dbResult(saved.error);
        link.error_code = null;
      }
    }
    const maps = await db
      .from("google_calendar_event_maps")
      .select("google_id,local_id,conflict_remote,read_only,error_code")
      .eq("link_id", link.id)
      .eq("conflict", true)
      .limit(21);
    dbResult(maps.error);
    const conflicts = [];
    for (const map of (maps.data ?? []).slice(0, 20)) {
      const local = await db
        .from("events")
        .select("*")
        .eq("family_id", family)
        .eq("id", map.local_id)
        .maybeSingle();
      dbResult(local.error);
      const localValue = local.data
        ? localFields(local.data as EventRecord, link.time_zone)
        : null;
      conflicts.push({
        googleId: map.google_id,
        localId: map.local_id,
        local: localValue,
        google: map.conflict_remote ?? null,
        readOnly: map.read_only,
        reason: map.error_code,
        expectedLocal: digest(JSON.stringify(localValue)),
        expectedRemote: digest(JSON.stringify(map.conflict_remote ?? null)),
      });
    }
    return jsonResponse({
      configured: true,
      missing: [],
      calendars,
      conflicts,
      more_conflicts: (maps.data?.length ?? 0) > 20,
      connection: {
        id: link.id,
        owner,
        status: link.status,
        calendarId: link.calendar_id,
        calendarName: link.calendar_name,
        timeZone: link.time_zone,
        lastAttempt: link.last_attempt_at,
        lastSuccess: link.last_success_at,
        error: link.error_code,
        inProgress: !!(
          link.lock_until && new Date(link.lock_until) > new Date()
        ),
        more: link.phase === "push" || !!link.scan_min,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("connect"), family_id: familySchema }),
  z.object({
    action: z.literal("select"),
    family_id: familySchema,
    calendar_id: z.string().min(1).max(1024),
    consent: z.literal(true),
    include_existing: z.boolean(),
  }),
  z.object({
    action: z.enum(["sync", "pause", "resume", "disconnect"]),
    family_id: familySchema,
  }),
  z.object({
    action: z.literal("resolve"),
    family_id: familySchema,
    google_id: z.string().min(1).max(1024),
    choice: z.enum(["local", "google"]),
    expected_local: z.string().regex(/^[a-f0-9]{64}$/),
    expected_remote: z.string().regex(/^[a-f0-9]{64}$/),
    confirmed: z.literal(true),
  }),
]);
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await readJson(request));
    const { db, link, userId } = await accessFor(request, body.family_id);
    if (configuration().length)
      throw new FinanceApiError(
        "Complete the Google Calendar setup before connecting.",
        503,
      );
    if (body.action === "connect") {
      if (
        link &&
        (link.user_id !== userId ||
          !["reconnect", "error", "choose_calendar"].includes(link.status))
      )
        throw new FinanceApiError(
          "Disconnect the existing Google connection before linking another account.",
          409,
        );
      const oauth = oauthClient(),
        codes = await oauth.generateCodeVerifierAsync();
      const state = randomBytes(32).toString("hex"),
        cookie = randomBytes(32).toString("hex");
      await db
        .from("google_calendar_oauth_states")
        .delete()
        .eq("family_id", body.family_id)
        .eq("user_id", userId);
      await db
        .from("google_calendar_oauth_states")
        .delete()
        .lt("expires_at", new Date().toISOString());
      const saved = await db.from("google_calendar_oauth_states").insert({
        state_hash: digest(state),
        cookie_hash: digest(cookie),
        family_id: body.family_id,
        user_id: userId,
        encrypted_verifier: seal(
          codes.codeVerifier,
          `oauth:${body.family_id}:${userId}`,
        ),
        expires_at: new Date(Date.now() + 600000).toISOString(),
      });
      dbResult(saved.error);
      const url = oauth.generateAuthUrl({
        scope: scopes,
        access_type: "offline",
        prompt: "consent",
        state,
        code_challenge: codes.codeChallenge,
        code_challenge_method: CodeChallengeMethod.S256,
      });
      const response = jsonResponse({ url });
      response.headers.set(
        "Set-Cookie",
        `gather_google_oauth=${cookie}; HttpOnly; SameSite=Lax; Path=/api/calendar/google/callback; Max-Age=600${redirectUri().startsWith("https:") ? "; Secure" : ""}`,
      );
      return response;
    }
    if (!link)
      throw new FinanceApiError("Connect a Google account first.", 409);
    if (body.action === "sync" || body.action === "resolve") {
      if (!["ready", "error"].includes(link.status) || !link.calendar_id)
        throw new FinanceApiError(
          "Choose a calendar and resume the connection before syncing.",
          409,
        );
      if (body.action === "sync")
        return jsonResponse(await syncGoogleCalendar(link.id));
      if (body.action === "resolve")
        return jsonResponse(
          await syncGoogleCalendar(link.id, {
            googleId: body.google_id,
            choice: body.choice,
            expectedLocal: body.expected_local,
            expectedRemote: body.expected_remote,
          }),
        );
    }
    if (
      link.user_id !== userId &&
      !(
        body.action === "disconnect" &&
        link.status === "paused" &&
        link.error_code === "owner_access_removed"
      )
    )
      throw new FinanceApiError(
        "The parent who connected Google must manage this connection.",
        403,
      );
    if (link.lock_until && new Date(link.lock_until) > new Date())
      throw new FinanceApiError(
        "A sync is finishing. Try this action again in a moment.",
        409,
      );
    if (body.action === "select") {
      if (link.status !== "choose_calendar")
        throw new FinanceApiError(
          "Disconnect before choosing a different calendar.",
          409,
        );
      if (link.calendar_id && link.calendar_id !== body.calendar_id)
        throw new FinanceApiError(
          "Reconnect the original calendar or disconnect before switching calendars.",
          409,
        );
      const token = await tokenFor(link);
      const calendar = await googleRequest(
        token,
        `users/me/calendarList/${encodeURIComponent(body.calendar_id)}`,
      );
      if (!["owner", "writer"].includes(calendar.accessRole))
        throw new FinanceApiError("Choose a calendar you can edit.", 403);
      const zone = z
        .string()
        .min(1)
        .max(100)
        .parse(calendar.timeZone ?? "UTC");
      new Intl.DateTimeFormat("en-US", { timeZone: zone });
      const result = await db
        .from("google_calendar_links")
        .update({
          calendar_id: calendar.id,
          calendar_name: String(calendar.summary ?? "Google Calendar").slice(
            0,
            200,
          ),
          time_zone: zone,
          status: "ready",
          sync_from:
            link.sync_from ??
            (body.include_existing
              ? "1970-01-01T00:00:00Z"
              : new Date().toISOString()),
          phase: "pull",
          scan_min: null,
          scan_max: null,
          page_token: null,
          pending: [],
          next_page_token: null,
          push_after: "",
          error_code: null,
        })
        .eq("id", link.id)
        .or(`lock_until.is.null,lock_until.lt.${new Date().toISOString()}`)
        .select("id");
      dbResult(result.error);
      if (!result.data?.length)
        throw new FinanceApiError("Sync is busy. Try again.", 409);
    } else if (body.action === "disconnect") {
      const result = await db
        .from("google_calendar_links")
        .delete()
        .eq("id", link.id)
        .or(`lock_until.is.null,lock_until.lt.${new Date().toISOString()}`)
        .select("id");
      dbResult(result.error);
      if (!result.data?.length)
        throw new FinanceApiError("Sync is busy. Try again.", 409);
    } else {
      if (
        !link.calendar_id ||
        (body.action === "resume" && link.status !== "paused") ||
        (body.action === "pause" && !["ready", "error"].includes(link.status))
      )
        throw new FinanceApiError(
          "This connection cannot change to that state yet.",
          409,
        );
      const result = await db
        .from("google_calendar_links")
        .update({
          status: body.action === "pause" ? "paused" : "ready",
          error_code: null,
        })
        .eq("id", link.id)
        .or(`lock_until.is.null,lock_until.lt.${new Date().toISOString()}`)
        .select("id");
      dbResult(result.error);
      if (!result.data?.length)
        throw new FinanceApiError("Sync is busy. Try again.", 409);
    }
    return jsonResponse({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
