import { randomUUID } from "node:crypto";
import { addDays } from "date-fns";
import {
  adminClient,
  dbResult,
  googleRequest,
  GoogleError,
  tokenFor,
} from "./server";
import {
  claimedLocalId,
  decision,
  digest,
  googleEventSchema,
  googleIdForLocal,
  googlePayload,
  localFields,
  localIdForGoogle,
  localPayload,
  remoteFields,
  same,
  type EventFields,
  type GoogleEvent,
} from "./core";
import type { EventRecord } from "../types";

type Link = {
  id: string;
  family_id: string;
  user_id: string;
  encrypted_refresh_token: string;
  calendar_id: string;
  time_zone: string;
  sync_from: string;
  phase: "pull" | "push";
  scan_min: string | null;
  scan_max: string | null;
  page_token: string | null;
  pending: GoogleEvent[];
  next_page_token: string | null;
  push_after: string;
  skipped_repeats: number;
};
type Mapping = {
  link_id: string;
  google_id: string;
  local_id: string;
  baseline: EventFields | null;
  conflict: boolean;
  read_only: boolean;
  error_code: string | null;
  conflict_remote?: EventFields | null;
};
export async function syncGoogleCalendar(
  id: string,
  resolution?: {
    googleId: string;
    choice: "local" | "google";
    expectedLocal: string;
    expectedRemote: string;
  },
) {
  const db = adminClient(),
    lease = randomUUID(),
    started = Date.now();
  const claim = await db.rpc("claim_google_calendar_sync", {
    target: id,
    lease,
  });
  dbResult(claim.error);
  const claimed = claim.data?.[0] as Link | undefined;
  if (!claimed) return { busy: true, more: false, processed: 0 };
  const link: Link = claimed;
  let processed = 0,
    skipped = 0;
  async function update(values: Record<string, unknown>) {
    const result = await db
      .from("google_calendar_links")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("lock_id", lease)
      .select("id");
    dbResult(result.error);
    if (!result.data?.length) throw new Error("Sync lease lost");
    Object.assign(link, values);
  }
  async function fence() {
    if (Date.now() - started > 23000) throw new GoogleError(504);
    const result = await db
      .from("google_calendar_links")
      .select("id")
      .eq("id", id)
      .eq("lock_id", lease)
      .gt("lock_until", new Date().toISOString())
      .maybeSingle();
    dbResult(result.error);
    if (!result.data) throw new Error("Sync lease lost");
  }
  const path = `calendars/${encodeURIComponent(link.calendar_id)}/events`;
  try {
    const member = await db
      .from("family_members")
      .select("id,role")
      .eq("family_id", link.family_id)
      .eq("user_id", link.user_id)
      .in("role", ["parent", "admin"])
      .limit(1)
      .maybeSingle();
    dbResult(member.error);
    if (!member.data) {
      await update({ status: "paused", error_code: "owner_access_removed" });
      return { more: false, processed: 0 };
    }
    const token = await tokenFor(link);
    const query = async (googleId: string) => {
      try {
        return googleEventSchema.parse(
          await googleRequest(token, `${path}/${encodeURIComponent(googleId)}`),
        );
      } catch (error) {
        if (error instanceof GoogleError && [404, 410].includes(error.status))
          return { id: googleId, status: "cancelled" } as GoogleEvent;
        throw error;
      }
    };
    async function saveMap(map: Mapping) {
      const result = await db
        .from("google_calendar_event_maps")
        .upsert(map, { onConflict: "link_id,google_id" });
      dbResult(result.error);
    }
    async function pair(
      remote: GoogleEvent,
      existingMap?: Mapping,
      force?: "local" | "google",
      suppliedLocal?: EventRecord | null,
    ) {
      const localId =
        existingMap?.local_id ??
        claimedLocalId(id, remote) ??
        localIdForGoogle(id, remote.id);
      const loaded =
        suppliedLocal !== undefined
          ? { data: suppliedLocal, error: null }
          : await db
              .from("events")
              .select("*")
              .eq("family_id", link.family_id)
              .eq("id", localId)
              .maybeSingle();
      dbResult(loaded.error);
      const local = loaded.data as EventRecord | null;
      const remoteValue = remoteFields(remote),
        localValue = local ? localFields(local, link.time_zone) : null;
      const readOnly = !!(
        remote.attendees?.length ||
        remote.locked ||
        remote.organizer?.self === false ||
        (remote.eventType && remote.eventType !== "default")
      );
      const map: Mapping = existingMap ?? {
        link_id: id,
        google_id: remote.id,
        local_id: localId,
        baseline: null,
        conflict: false,
        read_only: readOnly,
        error_code: null,
      };
      let action = decision(map.baseline, localValue, remoteValue);
      if (force) {
        if (
          digest(JSON.stringify(localValue)) !== resolution!.expectedLocal ||
          digest(JSON.stringify(remoteValue)) !== resolution!.expectedRemote
        ) {
          await saveMap({
            ...map,
            conflict: true,
            conflict_remote: remoteValue,
            error_code: "changed_since_review",
          });
          throw new GoogleError(409);
        }
        action = force === "local" ? "push" : "pull";
      }
      if (action === "push" && (readOnly || local?.recurrence_rule))
        action = "conflict";
      if (action === "equal" && !localValue && !remoteValue) {
        const result = await db
          .from("google_calendar_event_maps")
          .delete()
          .eq("link_id", id)
          .eq("google_id", remote.id);
        dbResult(result.error);
        return;
      }
      if (action === "conflict") {
        await saveMap({
          ...map,
          conflict: true,
          conflict_remote: remoteValue,
          read_only: readOnly,
          error_code: readOnly ? "google_read_only" : "both_changed",
        });
        return;
      }
      await fence();
      if (action === "pull") {
        if (remoteValue) {
          if (local) {
            const result = await db
              .from("events")
              .update(localPayload(remoteValue, link.time_zone))
              .eq("family_id", link.family_id)
              .eq("id", localId)
              .eq("updated_at", local.updated_at)
              .select("id");
            dbResult(result.error);
            if (!result.data?.length) {
              await saveMap({
                ...map,
                conflict: true,
                conflict_remote: remoteValue,
                read_only: readOnly,
                error_code: "local_changed",
              });
              return;
            }
          } else {
            const result = await db
              .from("events")
              .insert({
                id: localId,
                family_id: link.family_id,
                ...localPayload(remoteValue, link.time_zone),
                category: "Family",
                created_by: member.data!.id,
              });
            if (result.error?.code === "23505") {
              await saveMap({
                ...map,
                conflict: true,
                conflict_remote: remoteValue,
                read_only: readOnly,
                error_code: "local_changed",
              });
              return;
            }
            dbResult(result.error);
          }
        } else if (local) {
          const result = await db
            .from("events")
            .delete()
            .eq("family_id", link.family_id)
            .eq("id", localId)
            .eq("updated_at", local.updated_at)
            .select("id");
          dbResult(result.error);
          if (!result.data?.length) {
            await saveMap({
              ...map,
              conflict: true,
              conflict_remote: remoteValue,
              error_code: "local_changed",
            });
            return;
          }
        }
        await saveMap({
          ...map,
          baseline: remoteValue,
          conflict: false,
          read_only: readOnly,
          error_code: null,
        });
      } else if (action === "push") {
        try {
          if (remote.status !== "cancelled" && !remote.etag)
            throw new GoogleError(412);
          if (!localValue) {
            if (remote.status !== "cancelled")
              await googleRequest(
                token,
                `${path}/${encodeURIComponent(remote.id)}?sendUpdates=none`,
                { method: "DELETE", headers: { "If-Match": remote.etag! } },
              );
          } else if (remote.status === "cancelled") {
            // Never overwrite a tombstone or recreate a deleted mapped Google ID.
            if (existingMap?.baseline) {
              if (!force) {
                await saveMap({
                  ...map,
                  conflict: true,
                  conflict_remote: null,
                  error_code: "google_deleted",
                });
                return;
              }
              const replacement = googleIdForLocal(
                id,
                `${localId}:${remote.id}`,
              );
              const found = await query(replacement);
              if (found.status === "cancelled")
                await googleRequest(token, `${path}?sendUpdates=none`, {
                  method: "POST",
                  body: JSON.stringify({
                    id: replacement,
                    ...googlePayload(localValue),
                    extendedProperties: {
                      private: {
                        gatherLink: id,
                        gatherLocal: localId,
                        gatherSource: remote.id,
                      },
                    },
                  }),
                });
              else if (!same(remoteFields(found), localValue))
                throw new GoogleError(409);
              const result = await db
                .from("google_calendar_event_maps")
                .update({
                  google_id: replacement,
                  baseline: localValue,
                  conflict: false,
                  conflict_remote: null,
                  error_code: null,
                })
                .eq("link_id", id)
                .eq("google_id", remote.id);
              dbResult(result.error);
              return;
            }
            await googleRequest(token, `${path}?sendUpdates=none`, {
              method: "POST",
              body: JSON.stringify({
                id: remote.id,
                ...googlePayload(localValue),
                extendedProperties: {
                  private: { gatherLink: id, gatherLocal: localId },
                },
              }),
            });
          } else
            await googleRequest(
              token,
              `${path}/${encodeURIComponent(remote.id)}?sendUpdates=none`,
              {
                method: "PATCH",
                headers: { "If-Match": remote.etag! },
                body: JSON.stringify(googlePayload(localValue)),
              },
            );
          await saveMap({
            ...map,
            baseline: localValue,
            conflict: false,
            read_only: readOnly,
            error_code: null,
          });
        } catch (error) {
          if (
            error instanceof GoogleError &&
            [403, 409, 412].includes(error.status)
          ) {
            await saveMap({
              ...map,
              conflict: true,
              conflict_remote: remoteValue,
              read_only: readOnly,
              error_code: `google_${error.status}`,
            });
            return;
          }
          throw error;
        }
      } else
        await saveMap({
          ...map,
          baseline: localValue,
          conflict: false,
          read_only: readOnly,
          error_code: null,
        });
      processed++;
    }
    const mapped = await db
      .from("google_calendar_event_maps")
      .select("*")
      .eq("link_id", id)
      .limit(1001);
    dbResult(mapped.error);
    if ((mapped.data?.length ?? 0) > 1000) throw new GoogleError(413);
    const maps = mapped.data as Mapping[];
    if (resolution) {
      const map = maps.find(
        (item) => item.google_id === resolution.googleId && item.conflict,
      );
      if (!map) throw new GoogleError(409);
      await pair(await query(map.google_id), map, resolution.choice);
      await update({ status: "ready", error_code: null });
      return { more: true, processed };
    }
    if (link.phase === "pull") {
      if (!link.scan_min)
        await update({
          scan_min: addDays(new Date(), -30).toISOString(),
          scan_max: addDays(new Date(), 365).toISOString(),
          page_token: null,
          pending: [],
          next_page_token: null,
          skipped_repeats: 0,
        });
      if (!link.pending.length) {
        const params = new URLSearchParams({
          singleEvents: "true",
          showDeleted: "true",
          maxResults: "50",
          timeMin: link.scan_min!,
          timeMax: link.scan_max!,
          eventTypes: "default",
          fields:
            "items(id,etag,status,summary,description,location,start,end,recurringEventId,eventType,locked,organizer(self),attendees(self),extendedProperties),nextPageToken",
        });
        if (link.page_token) params.set("pageToken", link.page_token);
        const page = await googleRequest(token, `${path}?${params}`);
        const pending = (page.items ?? []).map((item: unknown) =>
          googleEventSchema.parse(item),
        );
        await update({ pending, next_page_token: page.nextPageToken ?? null });
      }
      let attempts = 0;
      while (
        link.pending.length &&
        attempts < 12 &&
        Date.now() - started < 15000
      ) {
        const remote = link.pending[0];
        await pair(
          remote,
          maps.find((map) => map.google_id === remote.id),
        );
        await update({ pending: link.pending.slice(1) });
        // Conflicts and cancellations also count toward the batch budget.
        attempts++;
      }
      if (!link.pending.length) {
        if (link.next_page_token)
          await update({
            page_token: link.next_page_token,
            next_page_token: null,
          });
        else await update({ phase: "push", push_after: "", page_token: null });
      }
      await update({ status: "ready", error_code: null });
      return { more: true, processed };
    }
    const locals = await db
      .from("events")
      .select("*")
      .eq("family_id", link.family_id)
      .gte("created_at", link.sync_from)
      .order("id")
      .limit(1001);
    dbResult(locals.error);
    if ((locals.data?.length ?? 0) > 1000) throw new GoogleError(413);
    const ids = [
      ...new Set([
        ...maps.map((map) => map.local_id),
        ...locals.data!.map((row) => row.id as string),
      ]),
    ]
      .filter((key) => key > link.push_after)
      .sort();
    let count = 0;
    for (const localId of ids) {
      if (count >= 10 || Date.now() - started >= 15000) break;
      const map = maps.find((row) => row.local_id === localId);
      const loaded = await db
        .from("events")
        .select("*")
        .eq("family_id", link.family_id)
        .eq("id", localId)
        .maybeSingle();
      dbResult(loaded.error);
      const local = loaded.data as EventRecord | null;
      if (!map && local?.recurrence_rule) skipped++;
      else {
        const remote = await query(
          map?.google_id ?? googleIdForLocal(id, localId),
        );
        const newMap = map ?? {
          link_id: id,
          google_id: remote.id,
          local_id: localId,
          baseline: null,
          conflict: false,
          read_only: false,
          error_code: null,
        };
        await pair(remote, newMap, undefined, local);
      }
      await update({ push_after: localId });
      count++;
    }
    const more = ids.length > count;
    const conflicts = await db
      .from("google_calendar_event_maps")
      .select("google_id", { count: "exact", head: true })
      .eq("link_id", id)
      .eq("conflict", true);
    dbResult(conflicts.error);
    const skippedTotal = link.skipped_repeats + skipped;
    await update({
      status: "ready",
      skipped_repeats: skippedTotal,
      error_code: conflicts.count
        ? "conflicts"
        : skippedTotal
          ? "local_repeats_skipped"
          : null,
      ...(!more
        ? {
            phase: "pull",
            scan_min: null,
            scan_max: null,
            pending: [],
            page_token: null,
            next_page_token: null,
            push_after: "",
            ...(!conflicts.count && !skippedTotal
              ? { last_success_at: new Date().toISOString() }
              : {}),
          }
        : {}),
    });
    return { more, processed, skipped };
  } catch (error) {
    const code =
      error instanceof GoogleError ? `google_${error.status}` : "sync_failed";
    await update({
      status: code === "google_401" ? "reconnect" : "error",
      error_code: code,
    });
    return { more: false, processed, error: code };
  } finally {
    const result = await db
      .from("google_calendar_links")
      .update({ lock_id: null, lock_until: null })
      .eq("id", id)
      .eq("lock_id", lease);
    dbResult(result.error);
  }
}
