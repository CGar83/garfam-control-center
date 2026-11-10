"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Link2, Pause, Play, Unplug } from "lucide-react";
import { useAppData } from "@/components/app/providers";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import type { EventFields } from "@/lib/google-calendar/core";

type Conflict = {
  googleId: string;
  localId: string;
  local: EventFields | null;
  google: EventFields | null;
  readOnly: boolean;
  reason: string;
  expectedLocal: string;
  expectedRemote: string;
};
type Metadata = {
  configured: boolean;
  missing?: string[];
  connection: {
    id: string;
    owner: boolean;
    status: string;
    calendarId: string | null;
    calendarName: string | null;
    timeZone: string;
    lastAttempt: string | null;
    lastSuccess: string | null;
    error: string | null;
    inProgress: boolean;
    more: boolean;
  } | null;
  calendars: { id: string; summary: string; timeZone?: string }[];
  conflicts: Conflict[];
  more_conflicts?: boolean;
};
const messages: Record<string, string> = {
  conflicts: "Both calendars changed. Review the conflicting changes below.",
  google_401: "Google access expired or was revoked. Reconnect your account.",
  google_403:
    "Google denied the request. Check calendar editing permissions and API access.",
  google_404:
    "The selected calendar is unavailable. Check sharing or reconnect.",
  google_409:
    "The event changed since your review. Refresh and review it again.",
  google_410: "The saved Google page expired. Reconnect to restart the scan.",
  google_412: "Google changed an event during sync. Review the conflict.",
  google_413:
    "The connection exceeded its supported size. Use a smaller dedicated family calendar.",
  google_429: "Google is rate limiting requests. Wait before retrying.",
  google_504: "Google took too long to respond. Try Sync now again.",
  owner_access_removed:
    "The connected parent's workspace access changed. Restore access or reconnect.",
  local_repeats_skipped:
    "Some Gather repeat rules were skipped. Create repeating series in Google.",
  sync_failed: "Sync stopped. Try Sync now again; reconnect if it continues.",
};

export function GoogleSyncPanel() {
  const { familyId, currentMember, usingLocalData } = useAppData();
  if (
    usingLocalData ||
    !currentMember ||
    !["parent", "admin"].includes(currentMember.role)
  )
    return (
      <p className="border-y py-4 text-sm text-muted-foreground">
        Sign in as a parent or admin to connect Google Calendar.
      </p>
    );
  return <ConnectedPanel key={`${familyId}:${currentMember.id}`} />;
}
function ConnectedPanel() {
  const { familyId, supabase } = useAppData();
  const { privacyMode } = usePrivacyMode();
  const { toast } = useToast();
  const [metadata, setMetadata] = useState<Metadata | null>(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [calendar, setCalendar] = useState(""),
    [consent, setConsent] = useState(false),
    [existing, setExisting] = useState(false);
  const [disconnect, setDisconnect] = useState(false),
    [resolve, setResolve] = useState<{
      item: Conflict;
      choice: "local" | "google";
    } | null>(null);
  const request = useCallback(
    async (action?: Record<string, unknown>, list = false) => {
      const session = await supabase?.auth.getSession();
      if (!session?.data.session)
        throw Error("Sign in again to manage Google Calendar.");
      const response = await fetch(
        `/api/calendar/google?family_id=${encodeURIComponent(familyId)}${list ? "&calendars=1" : ""}`,
        {
          method: action ? "POST" : "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
            "Content-Type": "application/json",
          },
          ...(action
            ? { body: JSON.stringify({ ...action, family_id: familyId }) }
            : {}),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw Error(body.error ?? "Google Calendar request failed.");
      return body;
    },
    [familyId, supabase],
  );
  const load = useCallback(async () => {
    let result: Metadata = await request();
    setMetadata(result);
    if (
      result.connection?.status === "choose_calendar" &&
      result.connection.owner
    )
      result = await request(undefined, true);
    setMetadata(result);
    setCalendar((current) => current || result.connection?.calendarId || "");
  }, [request]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        let result: Metadata = await request();
        if (active) setMetadata(result);
        if (
          result.connection?.status === "choose_calendar" &&
          result.connection.owner
        )
          result = await request(undefined, true);
        if (active) {
          setMetadata(result);
          setCalendar(
            (current) => current || result.connection?.calendarId || "",
          );
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load Google Calendar.",
          );
      }
    };
    if (new URLSearchParams(window.location.search).has("google_error"))
      setError(
        "Google authorization did not finish. Try Connect Google again and grant both Calendar permissions.",
      );
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20000);
    window.addEventListener("gather:google-sync-finished", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("gather:google-sync-finished", refresh);
    };
  }, [request]);
  async function act(action: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await request(action);
      if (result.url) {
        const url = new URL(result.url);
        if (url.origin !== "https://accounts.google.com")
          throw Error("Unexpected authorization address.");
        window.location.assign(url.toString());
        return;
      }
      if (result.error)
        setError(messages[result.error] ?? "Sync could not finish. Try again.");
      else
        toast({
          title: result.busy
            ? "Sync is already running"
            : action.action === "sync"
              ? "Sync checked"
              : "Google Calendar updated",
          description: result.more
            ? "More events remain. Sync now again or let background checks continue."
            : undefined,
        });
      await load();
      window.dispatchEvent(new Event("gather:google-sync"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Google Calendar request failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (privacyMode)
    return (
      <p className="border-y py-4 text-sm text-muted-foreground">
        Google connection details are hidden in privacy mode.
      </p>
    );
  const connection = metadata?.connection;
  return (
    <section
      className="space-y-4 border-y py-5"
      aria-label="Google two-way sync"
    >
      <h3 className="text-lg font-semibold">Google two-way sync</h3>
      <p className="text-sm text-muted-foreground">
        Keep one Google calendar and Gather calendar events in step. This
        connection does not share bills, tasks, health records or other modules.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {!metadata && !error && <p role="status">Checking connection...</p>}
      {metadata && !metadata.configured && (
        <div className="space-y-2 text-sm">
          <p>Google Calendar needs a one-time server setup.</p>
          <a
            className="text-primary underline"
            href="https://github.com/CGar83/garfam-control-center/blob/main/docs/GOOGLE_CALENDAR_SETUP.md"
            target="_blank"
            rel="noreferrer"
          >
            Open the setup walkthrough
          </a>
          <details>
            <summary className="cursor-pointer py-2">
              Missing server settings
            </summary>
            <ul className="space-y-1 break-all text-xs">
              {metadata.missing?.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
      {metadata?.configured && !connection && (
        <Button disabled={busy} onClick={() => void act({ action: "connect" })}>
          <Link2 className="h-4 w-4" />
          Connect Google
        </Button>
      )}
      {connection && (
        <>
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              {connection.calendarName ?? "Choose a Google calendar"}
            </p>
            <p>
              Status:{" "}
              {connection.inProgress
                ? "Syncing"
                : connection.status.replaceAll("_", " ")}
            </p>
            <p className="text-muted-foreground">
              Calendar time zone: {connection.timeZone}
            </p>
            <p className="text-muted-foreground">
              Last complete sync:{" "}
              {connection.lastSuccess
                ? new Date(connection.lastSuccess).toLocaleString()
                : "Not completed yet"}
            </p>
            {connection.lastAttempt && (
              <p className="text-muted-foreground">
                Last checked:{" "}
                {new Date(connection.lastAttempt).toLocaleString()}
              </p>
            )}
            {connection.more && (
              <p>Events remain in the current batch cycle.</p>
            )}
            {connection.error && (
              <p className="text-destructive">
                {messages[connection.error] ?? "Sync needs attention."}
              </p>
            )}
          </div>
          {connection.status === "choose_calendar" && connection.owner && (
            <div className="space-y-3">
              <label className="block text-sm">
                Google calendar
                <select
                  aria-label="Google calendar to sync"
                  className="mt-2 h-11 w-full rounded-lg border bg-background px-3"
                  value={calendar}
                  onChange={(event) => {
                    setCalendar(event.target.value);
                    setConsent(false);
                  }}
                >
                  <option value="" disabled>
                    Choose a calendar
                  </option>
                  {metadata?.calendars
                    .filter(
                      (item) =>
                        !connection.calendarId ||
                        item.id === connection.calendarId,
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.summary}
                      </option>
                    ))}
                </select>
              </label>
              {!metadata?.calendars.length && (
                <p className="text-sm text-destructive">
                  No writable calendars found. Check the Google account and
                  calendar sharing.
                </p>
              )}
              {!connection.calendarId && (
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={existing}
                    onChange={(event) => {
                      setExisting(event.target.checked);
                      setConsent(false);
                    }}
                  />
                  Also send existing Gather calendar events to Google
                </label>
              )}
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  Share titles, descriptions, locations and dates between this
                  Google calendar and this family workspace. Edits and deletions
                  of synced events affect both places. New Gather events are
                  shared automatically. Family members with calendar access can
                  see imported events.
                </span>
              </label>
              <Button
                disabled={busy || !consent || !calendar}
                onClick={() =>
                  void act({
                    action: "select",
                    calendar_id: calendar,
                    consent: true,
                    include_existing: existing,
                  })
                }
              >
                Start two-way sync
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {["ready", "error"].includes(connection.status) && (
              <Button
                disabled={busy || connection.inProgress}
                onClick={() => void act({ action: "sync" })}
              >
                <RefreshCw className="h-4 w-4" />
                Sync now
              </Button>
            )}
            {connection.owner && connection.status === "ready" && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void act({ action: "pause" })}
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            {connection.owner &&
              connection.status === "paused" &&
              connection.error !== "owner_access_removed" && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void act({ action: "resume" })}
                >
                  <Play className="h-4 w-4" />
                  Resume
                </Button>
              )}
            {connection.owner &&
              ["reconnect", "error"].includes(connection.status) && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void act({ action: "connect" })}
                >
                  <Link2 className="h-4 w-4" />
                  Reconnect Google
                </Button>
              )}
            {(connection.owner ||
              connection.error === "owner_access_removed") && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setDisconnect(true)}
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </Button>
            )}
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void load().catch(() =>
                  setError("Could not refresh connection."),
                )
              }
            >
              Refresh status
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Checks run about every minute while Gather is open and every five
            minutes in the background. Large calendars need several batches. New
            Google events import from the past 30 days through the next year.
            Guest events are read-only here. Recurring Google events sync as
            individual occurrences; create repeating series in Google.
          </p>
          {!!metadata?.conflicts.length && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold">Review conflicting changes</h4>
              {metadata.conflicts.map((item) => (
                <article
                  key={item.googleId}
                  className="space-y-3 border-b pb-4"
                >
                  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    {[
                      ["Gather", item.local],
                      ["Google at last check", item.google],
                    ].map(([label, value]) => {
                      const fields = value as EventFields | null;
                      return (
                        <div key={String(label)} className="min-w-0">
                          <h5 className="text-xs font-semibold text-muted-foreground">
                            {String(label)}
                          </h5>
                          <p className="mt-1 break-words text-sm font-medium">
                            {fields?.title ?? "Deleted"}
                          </p>
                          {fields && (
                            <>
                              <p className="break-words text-xs">
                                {fields.start} – {fields.end}
                              </p>
                              <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                                {fields.location}
                                {fields.description
                                  ? ` · ${fields.description}`
                                  : ""}
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {item.readOnly && (
                    <p className="text-xs">
                      Edit this event in Google because it has guests or is
                      read-only.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy || item.readOnly}
                      onClick={() => setResolve({ item, choice: "local" })}
                    >
                      Keep Gather version
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setResolve({ item, choice: "google" })}
                    >
                      Use Google version
                    </Button>
                  </div>
                </article>
              ))}
              {metadata.more_conflicts && (
                <p className="text-xs">
                  Resolve these conflicts to load the remaining ones.
                </p>
              )}
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={disconnect}
        onOpenChange={setDisconnect}
        title="Disconnect Google Calendar?"
        description="Stops sync and deletes this workspace's saved Google credential. Copied events remain in both places. Reconnecting can copy events again. You can also revoke access in your Google Account settings."
        confirmLabel="Disconnect"
        onConfirm={() => act({ action: "disconnect" })}
      />
      <ConfirmDialog
        open={!!resolve}
        onOpenChange={(open) => {
          if (!open) setResolve(null);
        }}
        title="Apply this event version?"
        description="The chosen version replaces the other copy. Choosing a deleted version deletes the surviving event. If either copy changed since this review, review it again."
        confirmLabel="Apply version"
        onConfirm={() =>
          resolve
            ? act({
                action: "resolve",
                google_id: resolve.item.googleId,
                choice: resolve.choice,
                expected_local: resolve.item.expectedLocal,
                expected_remote: resolve.item.expectedRemote,
                confirmed: true,
              })
            : Promise.resolve()
        }
      />
    </section>
  );
}
