import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => {
  class GoogleError extends Error {
    constructor(public status: number) {
      super("Google test error");
    }
  }
  return {
    tables: {} as Record<string, Record<string, unknown>[]>,
    remote: new Map<string, Record<string, unknown>>(),
    writes: [] as string[],
    failMap: false,
    clock: 0,
    GoogleError,
    token: vi.fn(),
    makeDb: () => ({}) as unknown,
  };
});
vi.mock("@/lib/google-calendar/server", () => ({
  adminClient: () => state.makeDb(),
  tokenFor: () => state.token(),
  GoogleError: state.GoogleError,
  dbResult: (error: unknown) => {
    if (error) throw Error("Test storage failure");
  },
  googleRequest: async (
    _token: string,
    path: string,
    init: RequestInit = {},
  ) => {
    const method = init.method ?? "GET",
      parts = path.split("?")[0].split("/"),
      id = decodeURIComponent(parts.at(-1)!);
    if (method === "GET" && id === "events")
      return { items: structuredClone([...state.remote.values()]) };
    if (method === "GET") {
      const row = state.remote.get(id);
      if (!row) throw new state.GoogleError(404);
      return structuredClone(row);
    }
    state.writes.push(method);
    if (method === "POST") {
      const row = JSON.parse(String(init.body));
      if (state.remote.has(row.id)) throw new state.GoogleError(409);
      const result = {
        ...row,
        etag: `v${++state.clock}`,
        organizer: { self: true },
      };
      state.remote.set(row.id, result);
      return structuredClone(result);
    }
    const row = state.remote.get(id);
    if (!row) throw new state.GoogleError(404);
    if (new Headers(init.headers).get("If-Match") !== row.etag)
      throw new state.GoogleError(412);
    const result =
      method === "DELETE"
        ? { id, status: "cancelled" }
        : {
            ...row,
            ...JSON.parse(String(init.body)),
            etag: `v${++state.clock}`,
          };
    state.remote.set(id, result);
    return structuredClone(result);
  },
}));
import { syncGoogleCalendar } from "@/lib/google-calendar/sync";
import {
  digest,
  googlePayload,
  localPayload,
  type EventFields,
} from "@/lib/google-calendar/core";

function database() {
  return {
    rpc: async (name: string, args: Record<string, string>) => {
      const row = state.tables.google_calendar_links.find(
        (item) => item.id === args.target,
      );
      if (
        !row ||
        !["ready", "error"].includes(String(row.status)) ||
        (row.lock_until && new Date(String(row.lock_until)) > new Date())
      )
        return { data: [], error: null };
      row.lock_id = args.lease;
      row.lock_until = new Date(Date.now() + 90000).toISOString();
      return { data: [structuredClone(row)], error: null };
    },
    from: (table: string) => {
      let operation = "read",
        values: Record<string, unknown> | undefined,
        head = false;
      const filters: ((row: Record<string, unknown>) => boolean)[] = [];
      let limit = Infinity,
        sort = "";
      const query = {
        select: (_columns?: string, options?: { head?: boolean }) => {
          head = !!options?.head;
          return query;
        },
        eq: (key: string, value: unknown) => {
          filters.push((row) => row[key] === value);
          return query;
        },
        gte: (key: string, value: string) => {
          filters.push((row) => String(row[key]) >= value);
          return query;
        },
        gt: (key: string, value: string) => {
          filters.push((row) => String(row[key]) > value);
          return query;
        },
        in: (key: string, list: string[]) => {
          filters.push((row) => list.includes(String(row[key])));
          return query;
        },
        limit: (value: number) => {
          limit = value;
          return query;
        },
        order: (key: string) => {
          sort = key;
          return query;
        },
        update: (input: Record<string, unknown>) => {
          operation = "update";
          values = input;
          return query;
        },
        insert: (input: Record<string, unknown>) => {
          operation = "insert";
          values = input;
          return query;
        },
        upsert: (input: Record<string, unknown>) => {
          operation = "upsert";
          values = input;
          return query;
        },
        delete: () => {
          operation = "delete";
          return query;
        },
        maybeSingle: async () => {
          const result = execute();
          return { ...result, data: result.data[0] ?? null };
        },
        then: <T>(
          resolve: (value: ReturnType<typeof execute>) => T,
          reject?: (reason: unknown) => T,
        ) => Promise.resolve(execute()).then(resolve, reject),
      };
      function execute() {
        const rows = state.tables[table] ?? (state.tables[table] = []);
        let selected = rows.filter((row) => filters.every((test) => test(row)));
        if (sort)
          selected.sort((a, b) =>
            String(a[sort]).localeCompare(String(b[sort])),
          );
        selected = selected.slice(0, limit);
        if (operation === "insert" || operation === "upsert") {
          if (table === "google_calendar_event_maps" && state.failMap) {
            state.failMap = false;
            return { data: [], error: { code: "failure" }, count: 0 };
          }
          const existing =
            table === "google_calendar_event_maps"
              ? rows.find(
                  (row) =>
                    row.link_id === values!.link_id &&
                    row.google_id === values!.google_id,
                )
              : rows.find((row) => row.id === values!.id);
          if (existing && operation === "insert")
            return { data: [], error: { code: "23505" }, count: 0 };
          if (existing) Object.assign(existing, structuredClone(values));
          else
            rows.push({
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...structuredClone(values),
            });
        } else if (operation === "update") {
          selected.forEach((row) =>
            Object.assign(
              row,
              structuredClone(values),
              table === "events"
                ? {
                    updated_at: new Date(
                      Date.now() + ++state.clock,
                    ).toISOString(),
                  }
                : {},
            ),
          );
        } else if (operation === "delete")
          state.tables[table] = rows.filter((row) => !selected.includes(row));
        return {
          data: head ? [] : structuredClone(selected),
          error: null,
          count: selected.length,
        };
      }
      return query;
    },
  };
}
const id = "00000000-0000-4000-8000-000000000010";
const fields: EventFields = {
  title: "Family walk",
  description: "Park loop",
  location: "Park",
  start: "2026-11-10T18:00:00.000Z",
  end: "2026-11-10T19:00:00.000Z",
  allDay: false,
};
function local(localId = "local-a", value = fields) {
  return {
    id: localId,
    family_id: "family",
    ...localPayload(value, "UTC"),
    category: "Family",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
async function cycle() {
  for (let i = 0; i < 20; i++) {
    const result = await syncGoogleCalendar(id);
    if (!result.more) return result;
  }
  throw Error("Cycle did not finish");
}
beforeEach(() => {
  state.clock = 0;
  state.writes = [];
  state.remote.clear();
  state.failMap = false;
  state.token.mockReset().mockResolvedValue("test-token");
  state.makeDb = database;
  state.tables = {
    google_calendar_links: [
      {
        id,
        family_id: "family",
        user_id: "user",
        encrypted_refresh_token: "fake",
        calendar_id: "calendar",
        time_zone: "UTC",
        sync_from: "1970-01-01T00:00:00Z",
        status: "ready",
        phase: "pull",
        scan_min: null,
        scan_max: null,
        page_token: null,
        pending: [],
        next_page_token: null,
        push_after: "",
        skipped_repeats: 0,
      },
    ],
    google_calendar_event_maps: [],
    events: [],
    family_members: [
      { id: "member", family_id: "family", user_id: "user", role: "parent" },
    ],
  };
});
describe("Google sync lifecycle", () => {
  it("pushes a new Gather event once and does not duplicate it on later scans", async () => {
    state.tables.events.push(local());
    await cycle();
    expect(state.remote.size).toBe(1);
    expect(state.writes).toEqual(["POST"]);
    await cycle();
    expect(state.remote.size).toBe(1);
    expect(state.tables.events).toHaveLength(1);
    expect(state.writes).toEqual(["POST"]);
  });
  it("pulls a Google event, then sends Gather edits back with conditional writes", async () => {
    state.remote.set("remote-a", {
      id: "remote-a",
      etag: "v1",
      ...googlePayload(fields),
      organizer: { self: true },
    });
    await cycle();
    expect(state.tables.events).toHaveLength(1);
    state.tables.events[0].title = "Longer family walk";
    await cycle();
    expect(state.remote.get("remote-a")?.summary).toBe("Longer family walk");
    expect(state.writes).toContain("PATCH");
  });
  it("propagates deletions in either direction only for mapped events", async () => {
    state.tables.events.push(local());
    await cycle();
    const remoteId = [...state.remote.keys()][0];
    state.tables.events = [];
    await cycle();
    expect(state.remote.get(remoteId)?.status).toBe("cancelled");
    state.remote.set("remote-b", {
      id: "remote-b",
      etag: "v1",
      ...googlePayload(fields),
      organizer: { self: true },
    });
    await cycle();
    expect(state.tables.events).toHaveLength(1);
    state.remote.set("remote-b", { id: "remote-b", status: "cancelled" });
    await cycle();
    expect(state.tables.events).toHaveLength(0);
  });
  it("keeps conflicting edits intact until a reviewed version is chosen", async () => {
    state.remote.set("remote-a", {
      id: "remote-a",
      etag: "v1",
      ...googlePayload(fields),
      organizer: { self: true },
    });
    await cycle();
    state.tables.events[0].title = "Gather version";
    state.remote.get("remote-a")!.summary = "Google version";
    state.remote.get("remote-a")!.etag = "v2";
    await cycle();
    expect(state.tables.google_calendar_event_maps[0].conflict).toBe(true);
    expect(state.tables.events[0].title).toBe("Gather version");
    expect(state.remote.get("remote-a")?.summary).toBe("Google version");
    const remote = { ...fields, title: "Google version" },
      current = { ...fields, title: "Gather version" };
    await syncGoogleCalendar(id, {
      googleId: "remote-a",
      choice: "google",
      expectedLocal: digest(JSON.stringify(current)),
      expectedRemote: digest(JSON.stringify(remote)),
    });
    expect(state.tables.events[0].title).toBe("Google version");
  });
  it("recovers from a failed mapping save without copying the same event twice", async () => {
    state.tables.events.push(local());
    await syncGoogleCalendar(id);
    state.failMap = true;
    await syncGoogleCalendar(id);
    expect(state.remote.size).toBe(1);
    expect(state.tables.google_calendar_event_maps).toHaveLength(0);
    Object.assign(state.tables.google_calendar_links[0], {
      phase: "pull",
      scan_min: null,
      pending: [],
    });
    await cycle();
    expect(state.remote.size).toBe(1);
    expect(state.tables.events).toHaveLength(1);
    expect(state.tables.google_calendar_event_maps).toHaveLength(1);
  });
  it("does not write guest events or sync for a removed parent", async () => {
    state.remote.set("remote-a", {
      id: "remote-a",
      etag: "v1",
      ...googlePayload(fields),
      attendees: [{ self: true }],
    });
    await cycle();
    state.tables.events[0].title = "Gather change";
    await cycle();
    expect(state.writes).toHaveLength(0);
    expect(state.tables.google_calendar_event_maps[0].read_only).toBe(true);
    state.tables.family_members = [];
    await cycle();
    expect(state.tables.google_calendar_links[0].status).toBe("paused");
  });
  it("marks revoked access for reconnect and releases the lease", async () => {
    state.token.mockRejectedValue(new state.GoogleError(401));
    await syncGoogleCalendar(id);
    expect(state.tables.google_calendar_links[0]).toMatchObject({
      status: "reconnect",
      lock_id: null,
      lock_until: null,
    });
  });
});
